"""
wards.py - Ward Boundary Mapping

For the MVP, we use approximated rectangular bounding boxes for 6 Ludhiana wards.
In a production system, this would use point-in-polygon checks against municipal GIS shapefiles.
"""

WARDS_BBOX = {
    "Ward 1 - Civil Lines": {"min_lat": 30.9100, "max_lat": 30.9500, "min_lng": 75.8300, "max_lng": 75.8700},
    "Ward 2 - Model Town": {"min_lat": 30.8800, "max_lat": 30.9100, "min_lng": 75.8300, "max_lng": 75.8600},
    "Ward 3 - Sarabha Nagar": {"min_lat": 30.8800, "max_lat": 30.9100, "min_lng": 75.8000, "max_lng": 75.8300},
    "Ward 4 - Dugri": {"min_lat": 30.8400, "max_lat": 30.8800, "min_lng": 75.8200, "max_lng": 75.8600},
    "Ward 5 - Industrial Area": {"min_lat": 30.8800, "max_lat": 30.9200, "min_lng": 75.8700, "max_lng": 75.9200},
    "Ward 6 - Old City": {"min_lat": 30.9100, "max_lat": 30.9300, "min_lng": 75.8400, "max_lng": 75.8700},
}

WARDS = list(WARDS_BBOX.keys())

DEFAULT_WARD = "Ward 1 - Civil Lines"

def get_ward_for_location(latitude: float, longitude: float) -> str:
    """
    Returns the ward name for a given latitude and longitude.
    Falls back to a default ward or closest ward approximation if outside all boxes.
    """
    for ward, bbox in WARDS_BBOX.items():
        if bbox["min_lat"] <= latitude <= bbox["max_lat"] and bbox["min_lng"] <= longitude <= bbox["max_lng"]:
            return ward
            
    # If it falls outside our approximated boxes, just return the default ward for the demo
    return DEFAULT_WARD
