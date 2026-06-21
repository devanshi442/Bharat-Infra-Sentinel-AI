#!/usr/bin/env python3
"""
regenerate_locations.py
Regenerates india_locations.json with city-specific ward names
instead of the generic "North-West Zone" repeated for every city.
Each city gets 4 wards named after real neighbourhoods/areas.
Run from backend/ directory.
"""
import json, os

# City-center + city-specific ward names
CITIES = {
    "Maharashtra": {
        "Mumbai": {
            "center": [19.0760, 72.8777],
            "wards": ["Andheri", "Bandra", "Kurla", "Dadar"],
        },
        "Pune": {
            "center": [18.5204, 73.8567],
            "wards": ["Shivajinagar", "Hadapsar", "Pimpri", "Kothrud"],
        },
        "Nagpur": {
            "center": [21.1458, 79.0882],
            "wards": ["Sitabuldi", "Dharampeth", "Lakadganj", "Nandanvan"],
        },
    },
    "Uttar Pradesh": {
        "Lucknow": {
            "center": [26.8467, 80.9462],
            "wards": ["Hazratganj", "Gomti Nagar", "Alambagh", "Chinhat"],
        },
        "Kanpur": {
            "center": [26.4499, 80.3319],
            "wards": ["Kidwai Nagar", "Kakadeo", "Govind Nagar", "Armapur"],
        },
        "Varanasi": {
            "center": [25.3176, 82.9739],
            "wards": ["Godowlia", "Shivpur", "Bhelupur", "Sarnath"],
        },
    },
    "Bihar": {
        "Patna": {
            "center": [25.5941, 85.1376],
            "wards": ["Patna Sahib", "Kankarbagh", "Rajendra Nagar", "Phulwari"],
        },
        "Gaya": {
            "center": [24.7955, 85.0002],
            "wards": ["Rampur", "Mohanpur", "Manpur", "Bodh Gaya"],
        },
    },
    "West Bengal": {
        "Kolkata": {
            "center": [22.5726, 88.3639],
            "wards": ["Tollygunge", "Salt Lake", "Ultadanga", "Ballygunge"],
        },
        "Howrah": {
            "center": [22.5958, 88.2636],
            "wards": ["Shibpur", "Golabari", "Liluah", "Santragachi"],
        },
    },
    "Tamil Nadu": {
        "Chennai": {
            "center": [13.0827, 80.2707],
            "wards": ["Anna Nagar", "Tambaram", "Royapuram", "Mylapore"],
        },
        "Coimbatore": {
            "center": [11.0168, 76.9558],
            "wards": ["RS Puram", "Singanallur", "Peelamedu", "Ganapathy"],
        },
        "Madurai": {
            "center": [9.9252, 78.1198],
            "wards": ["Goripalayam", "Kochadai", "Thirunagar", "Avaniyapuram"],
        },
    },
    "Punjab": {
        "Ludhiana": {
            "center": [30.9010, 75.8573],
            "wards": ["Gill Road", "Civil Lines", "Sarabha Nagar", "Haibowal"],
        },
        "Amritsar": {
            "center": [31.6340, 74.8723],
            "wards": ["Golden Avenue", "Ranjit Avenue", "Majitha Road", "Lawrence Road"],
        },
    },
    "Delhi": {
        "New Delhi": {
            "center": [28.6139, 77.2090],
            "wards": ["Karol Bagh", "Rohini", "Dwarka", "Shahdara"],
        },
    },
    "Karnataka": {
        "Bengaluru": {
            "center": [12.9716, 77.5946],
            "wards": ["Koramangala", "Whitefield", "Rajajinagar", "Yelahanka"],
        },
        "Mysuru": {
            "center": [12.2958, 76.6394],
            "wards": ["Vijayanagar", "Kuvempunagar", "Lakshmipuram", "Hebbal"],
        },
    },
    "Gujarat": {
        "Ahmedabad": {
            "center": [23.0225, 72.5714],
            "wards": ["Satellite", "Naroda", "Bopal", "Maninagar"],
        },
        "Surat": {
            "center": [21.1702, 72.8311],
            "wards": ["Adajan", "Athwa", "Katargam", "Varachha"],
        },
    },
    "Rajasthan": {
        "Jaipur": {
            "center": [26.9124, 75.7873],
            "wards": ["Mansarovar", "Malviya Nagar", "Sanganer", "Vaishali Nagar"],
        },
        "Jodhpur": {
            "center": [26.2389, 73.0243],
            "wards": ["Paota", "Sardarpura", "Ratanada", "Shastri Nagar"],
        },
    },
    "Andhra Pradesh": {
        "Visakhapatnam": {
            "center": [17.6868, 83.2185],
            "wards": ["Gajuwaka", "MVP Colony", "Seethammadhara", "Bheemunipatnam"],
        },
    },
    "Telangana": {
        "Hyderabad": {
            "center": [17.3850, 78.4867],
            "wards": ["Secunderabad", "Banjara Hills", "Kukatpally", "LB Nagar"],
        },
    },
    "Kerala": {
        "Thiruvananthapuram": {
            "center": [8.5241, 76.9366],
            "wards": ["Kazhakoottam", "Peroorkada", "Vattiyoorkavu", "Nemom"],
        },
        "Kochi": {
            "center": [9.9312, 76.2673],
            "wards": ["Ernakulam", "Edappally", "Kalamassery", "Maradu"],
        },
    },
    "Madhya Pradesh": {
        "Bhopal": {
            "center": [23.2599, 77.4126],
            "wards": ["Kolar Road", "Bairagarh", "Habibganj", "Ashoka Garden"],
        },
        "Indore": {
            "center": [22.7196, 75.8577],
            "wards": ["Vijay Nagar", "Lasudia", "Bhawarkua", "Palasia"],
        },
    },
}

OFFSET = 0.05  # ~5km half-width per ward

def build_locations():
    data = {}
    for state, cities in CITIES.items():
        data[state] = {}
        for city, info in cities.items():
            clat, clng = info["center"]
            ward_names = info["wards"]
            # Assign each of the 4 wards to a quadrant: NW, NE, SW, SE
            wards = []
            positions = [
                # (lat_min, lat_max, lng_min, lng_max)
                (clat,        clat + OFFSET, clng - OFFSET, clng),           # NW
                (clat,        clat + OFFSET, clng,          clng + OFFSET),  # NE
                (clat - OFFSET, clat,        clng - OFFSET, clng),           # SW
                (clat - OFFSET, clat,        clng,          clng + OFFSET),  # SE
            ]
            for i, (min_lat, max_lat, min_lng, max_lng) in enumerate(positions):
                wards.append({
                    "name": ward_names[i],
                    "min_lat": round(min_lat, 6),
                    "max_lat": round(max_lat, 6),
                    "min_lng": round(min_lng, 6),
                    "max_lng": round(max_lng, 6),
                })
            data[state][city] = {
                "center": info["center"],
                "wards": wards,
            }
    return data


if __name__ == "__main__":
    out_path = os.path.join(
        os.path.dirname(__file__), "app", "data", "india_locations.json"
    )
    data = build_locations()
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    total_cities = sum(len(c) for c in data.values())
    total_wards = sum(len(c[city]["wards"]) for c in data.values() for city in c)
    print(f"✓ Wrote {out_path}")
    print(f"  States: {len(data)}")
    print(f"  Cities: {total_cities}")
    print(f"  Wards:  {total_wards} (4 per city, all uniquely named)")
    # Verify no duplicates within a city
    for state, cities in data.items():
        for city, info in cities.items():
            names = [w["name"] for w in info["wards"]]
            assert len(names) == len(set(names)), f"DUPLICATE WARD NAMES in {city}!"
    print("  ✓ Ward uniqueness check passed — no city has duplicate ward names")
