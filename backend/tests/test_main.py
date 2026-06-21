"""
test_main.py - Tests for core utility functions in main.py.
"""
import math
import pytest
from app.main import haversine_distance


# ---------------------------------------------------------------------------
# haversine_distance
# ---------------------------------------------------------------------------

def test_haversine_same_point_is_zero():
    assert haversine_distance(30.9010, 75.8573, 30.9010, 75.8573) == 0


def test_haversine_roughly_100m():
    """0.0009° lat ≈ 100 m near Ludhiana."""
    lat1, lon1 = 30.9010, 75.8573
    lat2, lon2 = 30.9019, 75.8573
    dist = haversine_distance(lat1, lon1, lat2, lon2)
    assert 90 < dist < 115, f"Expected ~100 m, got {dist:.1f} m"


def test_haversine_known_distance():
    """Ludhiana → Chandigarh is roughly 95–100 km by straight line."""
    ludhiana   = (30.9010, 75.8573)
    chandigarh = (30.7333, 76.7794)
    dist_km = haversine_distance(*ludhiana, *chandigarh) / 1000
    assert 90 < dist_km < 115, f"Expected ~100 km, got {dist_km:.1f} km"


def test_haversine_symmetry():
    """Distance A→B must equal distance B→A."""
    a = (30.9010, 75.8573)
    b = (30.9050, 75.8600)
    assert haversine_distance(*a, *b) == pytest.approx(haversine_distance(*b, *a), rel=1e-9)


def test_haversine_returns_meters():
    """Result should be in meters (not km or degrees)."""
    # 1 degree latitude ≈ 111 km → should be > 100,000 m
    dist = haversine_distance(0.0, 0.0, 1.0, 0.0)
    assert dist > 100_000, f"Expected > 100,000 m for 1° lat, got {dist}"


def test_haversine_duplicate_check_threshold():
    """Issues within 100 m should be detected as duplicates."""
    base_lat, base_lon = 30.9010, 75.8573

    # 50 m away — should cluster
    lat_close = base_lat + (50 / 111_000)
    assert haversine_distance(base_lat, base_lon, lat_close, base_lon) < 100

    # 200 m away — should NOT cluster  
    lat_far = base_lat + (200 / 111_000)
    assert haversine_distance(base_lat, base_lon, lat_far, base_lon) > 100