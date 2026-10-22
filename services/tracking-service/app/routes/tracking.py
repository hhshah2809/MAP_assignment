from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime
import logging
from pymongo.errors import DuplicateKeyError

from app.models import (
    GPSPointInput,
    BatchGPSInput,
    LatestLocationResponse,
    LocationHistoryItem,
    RouteResponse,
    GeoJSONFeature,
    GeoJSONGeometry
)
from app.database import get_database
from app.rabbitmq import rabbitmq_publisher
from app.simulator import gps_simulator

router = APIRouter(prefix="/tracking", tags=["tracking"])
logger = logging.getLogger(__name__)


async def record_single_location(point: GPSPointInput) -> dict:
    db = get_database()
    point_dict = point.model_dump()
    point_dict["createdAt"] = datetime.utcnow()

    # GeoJSON geospatial point format for MongoDB 2dsphere indexing
    point_dict["location"] = {
        "type": "Point",
        "coordinates": [point.longitude, point.latitude]
    }

    # 1. Event Deduplication check
    existing_ping = await db.gps_pings.find_one({"eventId": point.eventId})
    if existing_ping:
        # Check for conflicting duplicate
        if (
            existing_ping["shipmentId"] != point.shipmentId or
            abs(existing_ping["latitude"] - point.latitude) > 1e-5 or
            abs(existing_ping["longitude"] - point.longitude) > 1e-5
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflicting duplicate eventId '{point.eventId}' detected."
            )
        # Idempotent re-submission: return existing record without duplicate insertion
        return existing_ping

    try:
        await db.gps_pings.insert_one(point_dict)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate eventId '{point.eventId}' rejected."
        )

    # 2. Monotonic Timestamp Fencing for Latest Location
    current_latest = await db.latest_locations.find_one({"shipmentId": point.shipmentId})

    should_update_latest = False
    if not current_latest:
        should_update_latest = True
    else:
        existing_ts = current_latest["timestamp"]
        # Ensure timestamp comparisons are timezone-aware or naive consistently
        if existing_ts.tzinfo is not None and point.timestamp.tzinfo is None:
            existing_ts = existing_ts.replace(tzinfo=None)
        elif existing_ts.tzinfo is None and point.timestamp.tzinfo is not None:
            incoming_ts = point.timestamp.replace(tzinfo=None)
        else:
            incoming_ts = point.timestamp

        if incoming_ts >= existing_ts:
            should_update_latest = True

    if should_update_latest:
        latest_doc = {
            "shipmentId": point.shipmentId,
            "latitude": point.latitude,
            "longitude": point.longitude,
            "speedKmh": point.speedKmh,
            "headingDeg": point.headingDeg,
            "altitudeM": point.altitudeM,
            "timestamp": point.timestamp,
            "updatedAt": datetime.utcnow()
        }
        await db.latest_locations.update_one(
            {"shipmentId": point.shipmentId},
            {"$set": latest_doc},
            upsert=True
        )

    # 3. Publish to RabbitMQ
    rabbitmq_publisher.publish_location({
        "eventId": point.eventId,
        "shipmentId": point.shipmentId,
        "latitude": point.latitude,
        "longitude": point.longitude,
        "speedKmh": point.speedKmh,
        "headingDeg": point.headingDeg,
        "altitudeM": point.altitudeM,
        "timestamp": point.timestamp.isoformat()
    })

    return point_dict


@router.post("/locations", status_code=status.HTTP_201_CREATED)
async def ingest_location(point: GPSPointInput):
    """Ingest single GPS coordinate ping with deduplication and monotonic fencing."""
    result = await record_single_location(point)
    return {
        "success": True,
        "message": "GPS location ingested successfully",
        "eventId": result.get("eventId")
    }


@router.post("/locations/batch", status_code=status.HTTP_201_CREATED)
async def ingest_batch_locations(batch: BatchGPSInput):
    """Ingest batch of GPS pings atomically."""
    processed = []
    for item in batch.locations:
        res = await record_single_location(item)
        processed.append(res.get("eventId"))
    return {
        "success": True,
        "processedCount": len(processed),
        "eventIds": processed
    }


@router.get("/shipments/{shipmentId}/latest", response_model=LatestLocationResponse)
async def get_latest_location(shipmentId: str):
    """Retrieve the latest validated coordinate for a shipment."""
    db = get_database()
    latest = await db.latest_locations.find_one({"shipmentId": shipmentId})
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No tracking location found for shipment {shipmentId}"
        )
    return LatestLocationResponse(
        shipmentId=latest["shipmentId"],
        latitude=latest["latitude"],
        longitude=latest["longitude"],
        speedKmh=latest.get("speedKmh", 0.0),
        headingDeg=latest.get("headingDeg", 0.0),
        altitudeM=latest.get("altitudeM", 0.0),
        timestamp=latest["timestamp"],
        updatedAt=latest["updatedAt"]
    )


@router.get("/shipments/{shipmentId}/history", response_model=List[LocationHistoryItem])
async def get_location_history(shipmentId: str, limit: int = 100):
    """Retrieve chronological breadcrumb history for a shipment."""
    db = get_database()
    cursor = db.gps_pings.find({"shipmentId": shipmentId}).sort("timestamp", -1).limit(limit)
    history = []
    async for doc in cursor:
        history.append(LocationHistoryItem(
            eventId=doc["eventId"],
            shipmentId=doc["shipmentId"],
            latitude=doc["latitude"],
            longitude=doc["longitude"],
            speedKmh=doc.get("speedKmh", 0.0),
            headingDeg=doc.get("headingDeg", 0.0),
            altitudeM=doc.get("altitudeM", 0.0),
            timestamp=doc["timestamp"]
        ))
    return history


@router.get("/shipments/{shipmentId}/route", response_model=RouteResponse)
async def get_shipment_route(shipmentId: str):
    """Retrieve GeoJSON LineString representing the historical shipment route."""
    db = get_database()
    cursor = db.gps_pings.find({"shipmentId": shipmentId}).sort("timestamp", 1)
    coords = []
    async for doc in cursor:
        coords.append([doc["longitude"], doc["latitude"]])

    return RouteResponse(
        shipmentId=shipmentId,
        totalPoints=len(coords),
        geojson=GeoJSONFeature(
            type="Feature",
            geometry=GeoJSONGeometry(
                type="LineString",
                coordinates=coords
            ),
            properties={"shipmentId": shipmentId, "totalPoints": len(coords)}
        )
    )


# --- GPS Simulator Endpoints ---

@router.post("/simulator/start/{shipmentId}")
async def start_simulation(shipmentId: str, steps: int = 12):
    """Pre-populates an initial realistic driving track along the I-5 corridor."""
    points = gps_simulator.generate_initial_route(shipmentId, steps=steps)
    for pt in points:
        await record_single_location(pt)
    return {
        "success": True,
        "shipmentId": shipmentId,
        "message": f"Generated {len(points)} simulated GPS track points",
        "currentPoint": points[-1].model_dump()
    }


@router.post("/simulator/step/{shipmentId}")
async def step_simulation(shipmentId: str):
    """Advances shipment vehicle location by 1 waypoint along the route."""
    next_point = gps_simulator.advance_step(shipmentId)
    await record_single_location(next_point)
    return {
        "success": True,
        "shipmentId": shipmentId,
        "point": next_point.model_dump()
    }
