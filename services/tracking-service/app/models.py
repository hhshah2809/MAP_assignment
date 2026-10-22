from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class GPSPointInput(BaseModel):
    eventId: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    shipmentId: str = Field(..., description="Target shipment UUID")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude from -90.0 to 90.0")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude from -180.0 to 180.0")
    speedKmh: Optional[float] = Field(default=0.0, ge=0.0, description="Vehicle ground speed in km/h")
    headingDeg: Optional[float] = Field(default=0.0, ge=0.0, le=360.0, description="Compass bearing (0-360)")
    altitudeM: Optional[float] = Field(default=0.0, description="Altitude in meters")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp of GPS ping")


class BatchGPSInput(BaseModel):
    locations: List[GPSPointInput] = Field(..., min_length=1, max_length=500)


class LatestLocationResponse(BaseModel):
    shipmentId: str
    latitude: float
    longitude: float
    speedKmh: float
    headingDeg: float
    altitudeM: float
    timestamp: datetime
    updatedAt: datetime


class LocationHistoryItem(BaseModel):
    eventId: str
    shipmentId: str
    latitude: float
    longitude: float
    speedKmh: float
    headingDeg: float
    altitudeM: float
    timestamp: datetime


class GeoJSONGeometry(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]  # [[lon, lat], ...]


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: dict


class RouteResponse(BaseModel):
    shipmentId: str
    totalPoints: int
    geojson: GeoJSONFeature
