import math
from typing import Dict, List, Optional, Tuple

# Pre-indexed coastal ports and marine reference points in Indian & International waters
COASTAL_PORT_REGISTRY: Dict[str, Dict[str, any]] = {
    "chennai": {"name": "Chennai Port", "lat": 13.0827, "lon": 80.2707, "state": "Tamil Nadu", "region": "Bay of Bengal"},
    "mumbai": {"name": "Mumbai Harbour", "lat": 18.9438, "lon": 72.8389, "state": "Maharashtra", "region": "Arabian Sea"},
    "kochi": {"name": "Cochin Port (Kochi)", "lat": 9.9656, "lon": 76.2425, "state": "Kerala", "region": "Arabian Sea"},
    "visakhapatnam": {"name": "Visakhapatnam Port (Vizag)", "lat": 17.6868, "lon": 83.2185, "state": "Andhra Pradesh", "region": "Bay of Bengal"},
    "vizag": {"name": "Visakhapatnam Port", "lat": 17.6868, "lon": 83.2185, "state": "Andhra Pradesh", "region": "Bay of Bengal"},
    "goa": {"name": "Mormugao Port (Goa)", "lat": 15.4187, "lon": 73.8010, "state": "Goa", "region": "Arabian Sea"},
    "panaji": {"name": "Panaji Coast", "lat": 15.4909, "lon": 73.8278, "state": "Goa", "region": "Arabian Sea"},
    "mormugao": {"name": "Mormugao Port", "lat": 15.4187, "lon": 73.8010, "state": "Goa", "region": "Arabian Sea"},
    "kolkata": {"name": "Kolkata / Syama Prasad Mookerjee Port", "lat": 22.5726, "lon": 88.3639, "state": "West Bengal", "region": "Bay of Bengal"},
    "haldia": {"name": "Haldia Port", "lat": 22.0253, "lon": 88.0583, "state": "West Bengal", "region": "Bay of Bengal"},
    "mangalore": {"name": "New Mangalore Port", "lat": 12.9230, "lon": 74.8190, "state": "Karnataka", "region": "Arabian Sea"},
    "tuticorin": {"name": "V.O. Chidambaranar Port (Tuticorin)", "lat": 8.7642, "lon": 78.1348, "state": "Tamil Nadu", "region": "Gulf of Mannar"},
    "thoothukudi": {"name": "Thoothukudi Port", "lat": 8.7642, "lon": 78.1348, "state": "Tamil Nadu", "region": "Gulf of Mannar"},
    "kanyakumari": {"name": "Kanyakumari Coast", "lat": 8.0883, "lon": 77.5385, "state": "Tamil Nadu", "region": "Indian Ocean"},
    "paradip": {"name": "Paradip Port", "lat": 20.2644, "lon": 86.6698, "state": "Odisha", "region": "Bay of Bengal"},
    "puri": {"name": "Puri Coast", "lat": 19.8135, "lon": 85.8312, "state": "Odisha", "region": "Bay of Bengal"},
    "veraval": {"name": "Veraval Fishing Port", "lat": 20.9000, "lon": 70.3667, "state": "Gujarat", "region": "Arabian Sea"},
    "kandla": {"name": "Deendayal Port (Kandla)", "lat": 23.0033, "lon": 70.2189, "state": "Gujarat", "region": "Gulf of Kutch"},
    "porbandar": {"name": "Porbandar Coast", "lat": 21.6417, "lon": 69.6293, "state": "Gujarat", "region": "Arabian Sea"},
    "gulf of mannar": {"name": "Gulf of Mannar Biosphere", "lat": 9.1000, "lon": 79.1500, "state": "Tamil Nadu", "region": "Gulf of Mannar"},
    "sundarbans": {"name": "Sundarbans Marine Delta", "lat": 21.7000, "lon": 88.8000, "state": "West Bengal", "region": "Bay of Bengal"},
    "andaman": {"name": "Port Blair (Andaman)", "lat": 11.6234, "lon": 92.7265, "state": "Andaman & Nicobar", "region": "Andaman Sea"},
    "port blair": {"name": "Port Blair", "lat": 11.6234, "lon": 92.7265, "state": "Andaman & Nicobar", "region": "Andaman Sea"},
    "lakshadweep": {"name": "Kavaratti (Lakshadweep)", "lat": 10.5667, "lon": 72.6417, "state": "Lakshadweep", "region": "Arabian Sea"},
    "kavaratti": {"name": "Kavaratti Island", "lat": 10.5667, "lon": 72.6417, "state": "Lakshadweep", "region": "Arabian Sea"},
    "gahirmatha": {"name": "Gahirmatha Marine Sanctuary", "lat": 20.7167, "lon": 87.0500, "state": "Odisha", "region": "Bay of Bengal"},
    "puducherry": {"name": "Puducherry Port", "lat": 11.9139, "lon": 79.8145, "state": "Puducherry", "region": "Bay of Bengal"},
    "pondicherry": {"name": "Puducherry Port", "lat": 11.9139, "lon": 79.8145, "state": "Puducherry", "region": "Bay of Bengal"},
    "rameshwaram": {"name": "Rameswaram Island", "lat": 9.2876, "lon": 79.3129, "state": "Tamil Nadu", "region": "Palk Strait"},
    "nagapattinam": {"name": "Nagapattinam Port", "lat": 10.7656, "lon": 79.8424, "state": "Tamil Nadu", "region": "Bay of Bengal"},
    "karwar": {"name": "Karwar Port", "lat": 14.8080, "lon": 74.1300, "state": "Karnataka", "region": "Arabian Sea"},
    "ratnagiri": {"name": "Ratnagiri Port", "lat": 16.9902, "lon": 73.2847, "state": "Maharashtra", "region": "Arabian Sea"},
    "dhamra": {"name": "Dhamra Port", "lat": 20.8250, "lon": 86.9700, "state": "Odisha", "region": "Bay of Bengal"},
    "krishnapatnam": {"name": "Krishnapatnam Port", "lat": 14.2500, "lon": 80.1167, "state": "Andhra Pradesh", "region": "Bay of Bengal"}
}

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth in kilometers."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

def km_to_nautical_miles(km: float) -> float:
    """Convert kilometers to Nautical Miles (NM)."""
    return round(km * 0.539957, 2)

def calculate_initial_compass_bearing(point_a: Tuple[float, float], point_b: Tuple[float, float]) -> float:
    """
    Calculates the initial bearing (forward azimuth) from point A to point B in degrees (0°-360°).
    point_a: (lat, lon), point_b: (lat, lon)
    """
    lat1, lon1 = math.radians(point_a[0]), math.radians(point_a[1])
    lat2, lon2 = math.radians(point_b[0]), math.radians(point_b[1])
    dlon = lon2 - lon1
    
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - (math.sin(lat1) * math.cos(lat2) * math.cos(dlon))
    initial_bearing = math.atan2(x, y)
    
    initial_bearing = math.degrees(initial_bearing)
    compass_bearing = (initial_bearing + 360.0) % 360.0
    return round(compass_bearing, 1)

def bearing_to_cardinal(bearing_deg: float) -> str:
    """Converts degrees to 16-point cardinal compass direction (e.g. NNE, E, SSW)."""
    cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                 "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = int(round(bearing_deg / 22.5)) % 16
    return cardinals[idx]

def get_bounding_box(lat: float, lon: float, radius_km: float) -> Dict[str, float]:
    """Calculates latitude/longitude bounding box for spatial search."""
    R = 6371.0
    lat_delta = math.degrees(radius_km / R)
    lon_delta = math.degrees(radius_km / (R * math.cos(math.radians(lat))))
    return {
        "min_lat": round(lat - lat_delta, 4),
        "max_lat": round(lat + lat_delta, 4),
        "min_lon": round(lon - lon_delta, 4),
        "max_lon": round(lon + lon_delta, 4),
    }

def resolve_location_name(query_text: str) -> Optional[Dict[str, any]]:
    """
    Matches location names mentioned in natural query text against the coastal port registry.
    """
    q_lower = query_text.lower()
    # Check multi-word keys first (e.g. "gulf of mannar", "port blair")
    sorted_keys = sorted(COASTAL_PORT_REGISTRY.keys(), key=lambda k: -len(k))
    for key in sorted_keys:
        if key in q_lower:
            data = COASTAL_PORT_REGISTRY[key].copy()
            data["matched_keyword"] = key
            return data
    return None

def find_nearest_port(lat: float, lon: float) -> Tuple[Dict[str, any], float]:
    """Finds the nearest registered port or coastal landmark to given coordinates."""
    min_dist = float("inf")
    nearest = None
    for key, port in COASTAL_PORT_REGISTRY.items():
        d = haversine_distance_km(lat, lon, port["lat"], port["lon"])
        if d < min_dist:
            min_dist = d
            nearest = port
    return nearest, min_dist
