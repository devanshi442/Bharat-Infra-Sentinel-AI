import json
import os

states = {
    "Maharashtra": {
        "Mumbai": {"center": [19.0760, 72.8777]},
        "Pune": {"center": [18.5204, 73.8567]},
        "Nagpur": {"center": [21.1458, 79.0882]}
    },
    "Uttar Pradesh": {
        "Lucknow": {"center": [26.8467, 80.9462]},
        "Kanpur": {"center": [26.4499, 80.3319]},
        "Varanasi": {"center": [25.3176, 82.9739]}
    },
    "Bihar": {
        "Patna": {"center": [25.5941, 85.1376]},
        "Gaya": {"center": [24.7955, 85.0002]}
    },
    "West Bengal": {
        "Kolkata": {"center": [22.5726, 88.3639]},
        "Howrah": {"center": [22.5958, 88.2636]}
    },
    "Tamil Nadu": {
        "Chennai": {"center": [13.0827, 80.2707]},
        "Coimbatore": {"center": [11.0168, 76.9558]},
        "Madurai": {"center": [9.9252, 78.1198]}
    },
    "Punjab": {
        "Ludhiana": {"center": [30.9010, 75.8573]},
        "Amritsar": {"center": [31.6340, 74.8723]}
    },
    "Delhi": {
        "New Delhi": {"center": [28.6139, 77.2090]}
    },
    "Karnataka": {
        "Bengaluru": {"center": [12.9716, 77.5946]},
        "Mysuru": {"center": [12.2958, 76.6394]}
    },
    "Gujarat": {
        "Ahmedabad": {"center": [23.0225, 72.5714]},
        "Surat": {"center": [21.1702, 72.8311]}
    },
    "Rajasthan": {
        "Jaipur": {"center": [26.9124, 75.7873]},
        "Jodhpur": {"center": [26.2389, 73.0243]}
    },
    "Andhra Pradesh": {
        "Visakhapatnam": {"center": [17.6868, 83.2185]}
    },
    "Telangana": {
        "Hyderabad": {"center": [17.3850, 78.4867]}
    },
    "Kerala": {
        "Thiruvananthapuram": {"center": [8.5241, 76.9366]},
        "Kochi": {"center": [9.9312, 76.2673]}
    },
    "Madhya Pradesh": {
        "Bhopal": {"center": [23.2599, 77.4126]},
        "Indore": {"center": [22.7196, 75.8577]}
    }
}

# Generate 4 pseudo-wards per city by splitting a 0.1 deg bounding box around the center
# 0.1 deg lat/lng is roughly 11km, a reasonable city proxy for MVP

data = {}
for state, cities in states.items():
    data[state] = {}
    for city, info in cities.items():
        lat, lng = info["center"]
        offset = 0.05
        # Create four wards but include the city name to ensure unique ward labels per city
        wards = [
            {"name": f"{city} - North-West Zone", "min_lat": lat, "max_lat": lat + offset, "min_lng": lng - offset, "max_lng": lng},
            {"name": f"{city} - North-East Zone", "min_lat": lat, "max_lat": lat + offset, "min_lng": lng, "max_lng": lng + offset},
            {"name": f"{city} - South-West Zone", "min_lat": lat - offset, "max_lat": lat, "min_lng": lng - offset, "max_lng": lng},
            {"name": f"{city} - South-East Zone", "min_lat": lat - offset, "max_lat": lat, "min_lng": lng, "max_lng": lng + offset},
        ]
        data[state][city] = {
            "center": [lat, lng],
            "wards": wards
        }

os.makedirs("c:/Users/Devanshi Saxena/Downloads/bharat-infra-sentinel/backend/app/data", exist_ok=True)
out_path = "c:/Users/Devanshi Saxena/Downloads/bharat-infra-sentinel/backend/app/data/india_locations.json"
with open(out_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"Generated {out_path} with {sum(len(c) for c in data.values())} cities and {sum(len(c)*4 for c in data.values())} wards.")
