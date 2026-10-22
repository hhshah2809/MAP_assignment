import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict
from app.models import GPSPointInput

# Common shipping corridors for realistic movement
I5_CORRIDOR_WAYPOINTS = [
    (47.6062, -122.3321),  # Seattle, WA
    (47.4829, -122.3132),  # Tukwila
    (47.2529, -122.4443),  # Tacoma
    (47.0379, -122.9007),  # Olympia
    (46.7162, -122.9543),  # Centralia
    (46.1382, -122.9382),  # Kelso
    (45.6387, -122.6615),  # Vancouver, WA
    (45.5152, -122.6784),  # Portland, OR
]

class GPSSimulator:
    def __init__(self):
        # In-memory simulator states: shipmentId -> current waypoint index
        self.active_simulations: Dict[str, int] = {}

    def calculate_bearing(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_lambda = math.radians(lon2 - lon1)
        y = math.sin(delta_lambda) * math.cos(phi2)
        x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
        theta = math.atan2(y, x)
        bearing = (math.degrees(theta) + 360) % 360
        return round(bearing, 1)

    def generate_initial_route(self, shipment_id: str, steps: int = 15) -> List[GPSPointInput]:
        """Generates a progressive historical route trail leading up to current location."""
        points = []
        base_time = datetime.now(timezone.utc) - timedelta(minutes=steps * 10)
        total_waypoints = len(I5_CORRIDOR_WAYPOINTS) - 1

        for i in range(steps):
            t = i / max(1, steps - 1)
            # Interpolate through waypoints
            segment_float = t * total_waypoints
            seg_idx = min(int(segment_float), total_waypoints - 1)
            seg_ratio = segment_float - seg_idx

            p1 = I5_CORRIDOR_WAYPOINTS[seg_idx]
            p2 = I5_CORRIDOR_WAYPOINTS[seg_idx + 1]

            lat = p1[0] + seg_ratio * (p2[0] - p1[0])
            lon = p1[1] + seg_ratio * (p2[1] - p1[1])
            bearing = self.calculate_bearing(p1[0], p1[1], p2[0], p2[1])
            speed = round(65.0 + math.sin(i) * 8.0, 1)
            alt = round(80.0 + math.cos(i) * 20.0, 1)

            point_time = base_time + timedelta(minutes=i * 10)

            points.append(GPSPointInput(
                eventId=str(uuid.uuid4()),
                shipmentId=shipment_id,
                latitude=round(lat, 5),
                longitude=round(lon, 5),
                speedKmh=speed,
                headingDeg=bearing,
                altitudeM=alt,
                timestamp=point_time
            ))

        self.active_simulations[shipment_id] = steps
        return points

    def advance_step(self, shipment_id: str) -> GPSPointInput:
        """Simulates one GPS step forward for a shipment."""
        current_step = self.active_simulations.get(shipment_id, 0)
        total_waypoints = len(I5_CORRIDOR_WAYPOINTS) - 1

        step_idx = min(current_step + 1, 30)
        self.active_simulations[shipment_id] = step_idx

        t = min(1.0, step_idx / 30.0)
        segment_float = t * total_waypoints
        seg_idx = min(int(segment_float), total_waypoints - 1)
        seg_ratio = segment_float - seg_idx

        p1 = I5_CORRIDOR_WAYPOINTS[seg_idx]
        p2 = I5_CORRIDOR_WAYPOINTS[seg_idx + 1]

        lat = p1[0] + seg_ratio * (p2[0] - p1[0])
        lon = p1[1] + seg_ratio * (p2[1] - p1[1])
        bearing = self.calculate_bearing(p1[0], p1[1], p2[0], p2[1])
        speed = round(68.0 + (step_idx % 5), 1)

        return GPSPointInput(
            eventId=str(uuid.uuid4()),
            shipmentId=shipment_id,
            latitude=round(lat, 5),
            longitude=round(lon, 5),
            speedKmh=speed,
            headingDeg=bearing,
            altitudeM=95.0,
            timestamp=datetime.now(timezone.utc)
        )

gps_simulator = GPSSimulator()
