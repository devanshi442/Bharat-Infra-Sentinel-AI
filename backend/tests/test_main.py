import pytest
from app.main import haversine_distance

def test_haversine_distance():
    # Coordinates of two points roughly 100m apart
    lat1, lon1 = 30.9010, 75.8573
    lat2, lon2 = 30.9019, 75.8573  # 0.0009 degrees latitude is ~100 meters
    
    dist = haversine_distance(lat1, lon1, lat2, lon2)
    assert 90 < dist < 110, f"Distance {dist} should be around 100 meters"

    # Same point should be 0
    assert haversine_distance(lat1, lon1, lat1, lon1) == 0
