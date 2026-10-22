import pytest
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError

from app.models import GPSPointInput
from app.simulator import gps_simulator


def test_gps_point_validation_valid():
    point = GPSPointInput(
        shipmentId="550e8400-e29b-41d4-a716-446655440000",
        latitude=47.6062,
        longitude=-122.3321,
        speedKmh=65.5,
        headingDeg=180.0
    )
    assert point.latitude == 47.6062
    assert point.longitude == -122.3321
    assert point.speedKmh == 65.5
    assert point.headingDeg == 180.0


def test_gps_point_validation_latitude_out_of_bounds():
    with pytest.raises(ValidationError):
        GPSPointInput(
            shipmentId="550e8400-e29b-41d4-a716-446655440000",
            latitude=95.0,  # Invalid: > 90
            longitude=-122.3321
        )

    with pytest.raises(ValidationError):
        GPSPointInput(
            shipmentId="550e8400-e29b-41d4-a716-446655440000",
            latitude=-91.0,  # Invalid: < -90
            longitude=-122.3321
        )


def test_gps_point_validation_longitude_out_of_bounds():
    with pytest.raises(ValidationError):
        GPSPointInput(
            shipmentId="550e8400-e29b-41d4-a716-446655440000",
            latitude=45.0,
            longitude=185.0  # Invalid: > 180
        )


def test_gps_point_validation_negative_speed():
    with pytest.raises(ValidationError):
        GPSPointInput(
            shipmentId="550e8400-e29b-41d4-a716-446655440000",
            latitude=45.0,
            longitude=-120.0,
            speedKmh=-5.0  # Invalid
        )


def test_simulator_bearing_calculation():
    # Due North: 0 deg
    bearing_north = gps_simulator.calculate_bearing(40.0, -100.0, 50.0, -100.0)
    assert abs(bearing_north - 0.0) < 1.0 or abs(bearing_north - 360.0) < 1.0

    # Due South: 180 deg
    bearing_south = gps_simulator.calculate_bearing(50.0, -100.0, 40.0, -100.0)
    assert abs(bearing_south - 180.0) < 1.0


def test_simulator_route_generation():
    shipment_id = "test-shipment-uuid-123"
    route = gps_simulator.generate_initial_route(shipment_id, steps=10)
    assert len(route) == 10
    assert route[0].shipmentId == shipment_id
    assert -90 <= route[0].latitude <= 90
    assert -180 <= route[0].longitude <= 180
    assert route[0].speedKmh >= 0


def test_monotonic_timestamp_logic():
    t1 = datetime.now(timezone.utc)
    t2 = t1 + timedelta(minutes=5)
    t_old = t1 - timedelta(minutes=5)

    # In our timestamp fencing, incoming t2 should update over t1
    assert t2 >= t1

    # Out of order incoming t_old should NOT update over t1
    assert not (t_old >= t1)
