import json
import os
import math

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "india_locations.json")

try:
    with open(DATA_FILE, "r") as f:
        INDIA_LOCATIONS = json.load(f)
except Exception as e:
    INDIA_LOCATIONS = {}

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_location_details(latitude: float, longitude: float):
    """
    Returns (state, city, ward) for a given coordinate.
    Finds the closest city, then matches the bounding box of the ward.
    """
    if not INDIA_LOCATIONS:
        return "Unknown", "Unknown", "Unknown"

    closest_city = None
    min_dist = float('inf')
    best_state = None
    best_city_name = None

    for state, cities in INDIA_LOCATIONS.items():
        for city, data in cities.items():
            dist = haversine_distance(latitude, longitude, data["center"][0], data["center"][1])
            if dist < min_dist:
                min_dist = dist
                closest_city = data
                best_state = state
                best_city_name = city

    if not closest_city:
        return "Unknown", "Unknown", "Unknown"

    best_ward = None
    for ward in closest_city.get("wards", []):
        if (ward["min_lat"] <= latitude <= ward["max_lat"] and 
            ward["min_lng"] <= longitude <= ward["max_lng"]):
            best_ward = ward["name"]
            break
            
    if not best_ward and closest_city.get("wards"):
        # Fallback to closest ward by center if not in bounding box
        min_w_dist = float('inf')
        for ward in closest_city["wards"]:
            w_lat = (ward["min_lat"] + ward["max_lat"]) / 2
            w_lng = (ward["min_lng"] + ward["max_lng"]) / 2
            dist = haversine_distance(latitude, longitude, w_lat, w_lng)
            if dist < min_w_dist:
                min_w_dist = dist
                best_ward = ward["name"]

    return best_state, best_city_name, best_ward or "Unknown"

def get_all_wards():
    """Returns a list of all known wards globally, useful for iteration if needed."""
    wards = []
    for state, cities in INDIA_LOCATIONS.items():
        for city, data in cities.items():
            for ward in data.get("wards", []):
                wards.append((state, city, ward["name"]))
    return wards
