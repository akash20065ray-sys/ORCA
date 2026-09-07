import math
import re
from typing import Dict, List, Optional, Tuple

# Pre-indexed coastal ports and marine reference points in Indian & International waters
COASTAL_PORT_REGISTRY: Dict[str, Dict[str, any]] = {
    # West Coast - Kerala & Lakshadweep
    "kochi": {"name": "Cochin Port (Kochi)", "lat": 9.9656, "lon": 76.2425, "state": "Kerala", "region": "Arabian Sea"},
    "munambam": {"name": "Munambam Fishing Harbour", "lat": 10.1833, "lon": 76.1667, "state": "Kerala", "region": "Arabian Sea"},
    "beypore": {"name": "Beypore Port (Kozhikode)", "lat": 11.1633, "lon": 75.8078, "state": "Kerala", "region": "Arabian Sea"},
    "kozhikode": {"name": "Kozhikode (Calicut) Coast", "lat": 11.2588, "lon": 75.7804, "state": "Kerala", "region": "Arabian Sea"},
    "vizhinjam": {"name": "Vizhinjam International Seaport", "lat": 8.3767, "lon": 76.9933, "state": "Kerala", "region": "Arabian Sea"},
    "kollam": {"name": "Kollam (Neendakara) Harbour", "lat": 8.9333, "lon": 76.5333, "state": "Kerala", "region": "Arabian Sea"},
    "neendakara": {"name": "Neendakara Fishing Harbour", "lat": 8.9333, "lon": 76.5333, "state": "Kerala", "region": "Arabian Sea"},
    "alappuzha": {"name": "Alappuzha (Alleppey) Coast", "lat": 9.4981, "lon": 76.3264, "state": "Kerala", "region": "Arabian Sea"},
    "kannur": {"name": "Kannur (Azheekkall) Port", "lat": 11.9500, "lon": 75.3167, "state": "Kerala", "region": "Arabian Sea"},
    "ponnani": {"name": "Ponnani Fishing Harbour", "lat": 10.7760, "lon": 75.9250, "state": "Kerala", "region": "Arabian Sea"},
    "lakshadweep": {"name": "Kavaratti (Lakshadweep)", "lat": 10.5667, "lon": 72.6417, "state": "Lakshadweep", "region": "Arabian Sea"},
    "kavaratti": {"name": "Kavaratti Island Harbour", "lat": 10.5667, "lon": 72.6417, "state": "Lakshadweep", "region": "Arabian Sea"},
    "agatti": {"name": "Agatti Island Lagoon", "lat": 10.8533, "lon": 72.1931, "state": "Lakshadweep", "region": "Arabian Sea"},
    "minicoy": {"name": "Minicoy Port (Lakshadweep)", "lat": 8.2833, "lon": 73.0500, "state": "Lakshadweep", "region": "Arabian Sea"},

    # West Coast - Karnataka & Goa
    "mangalore": {"name": "New Mangalore Port", "lat": 12.9230, "lon": 74.8190, "state": "Karnataka", "region": "Arabian Sea"},
    "malpe": {"name": "Malpe Fishing Harbour (Udupi)", "lat": 13.3500, "lon": 74.7000, "state": "Karnataka", "region": "Arabian Sea"},
    "karwar": {"name": "Karwar Port", "lat": 14.8080, "lon": 74.1300, "state": "Karnataka", "region": "Arabian Sea"},
    "tadadi": {"name": "Tadadi Fishing Harbour", "lat": 14.5200, "lon": 74.3700, "state": "Karnataka", "region": "Arabian Sea"},
    "goa": {"name": "Mormugao Port (Goa)", "lat": 15.4187, "lon": 73.8010, "state": "Goa", "region": "Arabian Sea"},
    "mormugao": {"name": "Mormugao Port", "lat": 15.4187, "lon": 73.8010, "state": "Goa", "region": "Arabian Sea"},
    "panaji": {"name": "Panaji Coast", "lat": 15.4909, "lon": 73.8278, "state": "Goa", "region": "Arabian Sea"},

    # West Coast - Maharashtra & Gujarat
    "mumbai": {"name": "Mumbai Harbour & Sassoon Dock", "lat": 18.9438, "lon": 72.8389, "state": "Maharashtra", "region": "Arabian Sea"},
    "sassoon": {"name": "Sassoon Fishing Dock (Mumbai)", "lat": 18.9142, "lon": 72.8278, "state": "Maharashtra", "region": "Arabian Sea"},
    "nhava sheva": {"name": "Jawaharlal Nehru Port (JNPT)", "lat": 18.9500, "lon": 72.9500, "state": "Maharashtra", "region": "Arabian Sea"},
    "alibaug": {"name": "Alibaug Coast", "lat": 18.6414, "lon": 72.8722, "state": "Maharashtra", "region": "Arabian Sea"},
    "ratnagiri": {"name": "Ratnagiri Port", "lat": 16.9902, "lon": 73.2847, "state": "Maharashtra", "region": "Arabian Sea"},
    "malvan": {"name": "Malvan Marine Coast", "lat": 16.0600, "lon": 73.4700, "state": "Maharashtra", "region": "Arabian Sea"},
    "veraval": {"name": "Veraval Fishing Port", "lat": 20.9000, "lon": 70.3667, "state": "Gujarat", "region": "Arabian Sea"},
    "porbandar": {"name": "Porbandar Coast", "lat": 21.6417, "lon": 69.6293, "state": "Gujarat", "region": "Arabian Sea"},
    "kandla": {"name": "Deendayal Port (Kandla)", "lat": 23.0033, "lon": 70.2189, "state": "Gujarat", "region": "Gulf of Kutch"},
    "mundra": {"name": "Mundra Port", "lat": 22.7400, "lon": 69.7000, "state": "Gujarat", "region": "Gulf of Kutch"},
    "okha": {"name": "Okha Port", "lat": 22.4667, "lon": 69.0667, "state": "Gujarat", "region": "Arabian Sea"},

    # East Coast - Tamil Nadu & Puducherry
    "chennai": {"name": "Chennai Port", "lat": 13.0827, "lon": 80.2707, "state": "Tamil Nadu", "region": "Bay of Bengal"},
    "kasimedu": {"name": "Kasimedu Fishing Harbour (Chennai)", "lat": 13.1189, "lon": 80.2978, "state": "Tamil Nadu", "region": "Bay of Bengal"},
    "ennore": {"name": "Kamarajar Port (Ennore)", "lat": 13.2500, "lon": 80.3333, "state": "Tamil Nadu", "region": "Bay of Bengal"},
    "tuticorin": {"name": "V.O. Chidambaranar Port (Tuticorin)", "lat": 8.7642, "lon": 78.1348, "state": "Tamil Nadu", "region": "Gulf of Mannar"},
    "thoothukudi": {"name": "Thoothukudi Port", "lat": 8.7642, "lon": 78.1348, "state": "Tamil Nadu", "region": "Gulf of Mannar"},
    "kanyakumari": {"name": "Kanyakumari Coast", "lat": 8.0883, "lon": 77.5385, "state": "Tamil Nadu", "region": "Indian Ocean"},
    "rameshwaram": {"name": "Rameswaram Island & Palk Bay", "lat": 9.2876, "lon": 79.3129, "state": "Tamil Nadu", "region": "Palk Strait"},
    "gulf of mannar": {"name": "Gulf of Mannar Biosphere", "lat": 9.1000, "lon": 79.1500, "state": "Tamil Nadu", "region": "Gulf of Mannar"},
    "nagapattinam": {"name": "Nagapattinam Port", "lat": 10.7656, "lon": 79.8424, "state": "Tamil Nadu", "region": "Bay of Bengal"},
    "cuddalore": {"name": "Cuddalore Port", "lat": 11.7480, "lon": 79.7714, "state": "Tamil Nadu", "region": "Bay of Bengal"},
    "puducherry": {"name": "Puducherry Port", "lat": 11.9139, "lon": 79.8145, "state": "Puducherry", "region": "Bay of Bengal"},
    "karaikal": {"name": "Karaikal Port", "lat": 10.8350, "lon": 79.8550, "state": "Puducherry", "region": "Bay of Bengal"},

    # East Coast - Andhra Pradesh & Odisha
    "visakhapatnam": {"name": "Visakhapatnam Port (Vizag)", "lat": 17.6868, "lon": 83.2185, "state": "Andhra Pradesh", "region": "Bay of Bengal"},
    "vizag": {"name": "Visakhapatnam Port", "lat": 17.6868, "lon": 83.2185, "state": "Andhra Pradesh", "region": "Bay of Bengal"},
    "kakinada": {"name": "Kakinada Deep Water Port", "lat": 16.9891, "lon": 82.2858, "state": "Andhra Pradesh", "region": "Bay of Bengal"},
    "machilipatnam": {"name": "Machilipatnam Port", "lat": 16.1875, "lon": 81.1389, "state": "Andhra Pradesh", "region": "Bay of Bengal"},
    "krishnapatnam": {"name": "Krishnapatnam Port", "lat": 14.2500, "lon": 80.1167, "state": "Andhra Pradesh", "region": "Bay of Bengal"},
    "paradip": {"name": "Paradip Port", "lat": 20.2644, "lon": 86.6698, "state": "Odisha", "region": "Bay of Bengal"},
    "dhamra": {"name": "Dhamra Port", "lat": 20.8250, "lon": 86.9700, "state": "Odisha", "region": "Bay of Bengal"},
    "puri": {"name": "Puri Coast", "lat": 19.8135, "lon": 85.8312, "state": "Odisha", "region": "Bay of Bengal"},
    "gopalpur": {"name": "Gopalpur Port", "lat": 19.3000, "lon": 84.9700, "state": "Odisha", "region": "Bay of Bengal"},
    "gahirmatha": {"name": "Gahirmatha Marine Sanctuary", "lat": 20.7167, "lon": 87.0500, "state": "Odisha", "region": "Bay of Bengal"},

    # East Coast - West Bengal & Andaman
    "kolkata": {"name": "Kolkata / Syama Prasad Mookerjee Port", "lat": 22.5726, "lon": 88.3639, "state": "West Bengal", "region": "Bay of Bengal"},
    "haldia": {"name": "Haldia Port", "lat": 22.0253, "lon": 88.0583, "state": "West Bengal", "region": "Bay of Bengal"},
    "digha": {"name": "Digha Coast & Petuaghat Harbour", "lat": 21.6266, "lon": 87.5074, "state": "West Bengal", "region": "Bay of Bengal"},
    "sundarbans": {"name": "Sundarbans Marine Delta", "lat": 21.7000, "lon": 88.8000, "state": "West Bengal", "region": "Bay of Bengal"},
    "andaman": {"name": "Port Blair (Andaman)", "lat": 11.6234, "lon": 92.7265, "state": "Andaman & Nicobar", "region": "Andaman Sea"},
    "port blair": {"name": "Port Blair", "lat": 11.6234, "lon": 92.7265, "state": "Andaman & Nicobar", "region": "Andaman Sea"},
    "colombo": {"name": "Port of Colombo (Sri Lanka)", "lat": 6.9497, "lon": 79.8433, "state": "Western Province", "region": "Indian Ocean"},
    "male": {"name": "Malé Commercial Harbour", "lat": 4.1755, "lon": 73.5093, "state": "Kaafu Atoll", "region": "Indian Ocean"}
}

# Multilingual and Transliterated Vernacular Synonyms Mapping to Registry Keys
PORT_SYNONYMS: Dict[str, str] = {
    # Kochi / Cochin
    "cochin": "kochi", "कोच्चि": "kochi", "कोचीन": "kochi", "कोची": "kochi",
    "கொச்சி": "kochi", "കൊച്ചി": "kochi", "കൊച്ചിയിൽ": "kochi", "కొచ్చి": "kochi", "কোচি": "kochi",
    "કોચી": "kochi", "ಕೊಚ್ಚಿ": "kochi",
    # Munambam
    "മുനമ്പം": "munambam", "മുനമ്പത്ത്": "munambam", "മുനമ്പത്തെ": "munambam", "മുനമ്പം ഹാർബർ": "munambam",
    "முனம்பம்": "munambam", "मुनंबम": "munambam", "మునంబం": "munambam",
    # Beypore & Kozhikode
    "calicut": "kozhikode", "ബേപ്പൂർ": "beypore", "ബേപ്പൂരിൽ": "beypore", "കോഴിക്കോട്": "kozhikode",
    "കോഴിക്കോട്ട്": "kozhikode", "कोझिकोड": "kozhikode", "கோழிக்கோடு": "kozhikode", "बेपोर": "beypore",
    # Vizhinjam
    "വിഴിഞ്ഞം": "vizhinjam", "വിഴിഞ്ഞത്ത്": "vizhinjam", "விழிஞ்சம்": "vizhinjam", "विझिंजम": "vizhinjam",
    # Kollam & Neendakara
    "quilon": "kollam", "കൊല്ലം": "kollam", "കൊല്ലത്ത്": "kollam", "നീണ്ടകരെ": "neendakara",
    "നീണ്ടകര": "neendakara", "നീണ്ടകരയിൽ": "neendakara", "कोल्लम": "kollam",
    # Alappuzha
    "alleppey": "alappuzha", "ആലപ്പുഴ": "alappuzha", "ആലപ്പുഴയിൽ": "alappuzha", "ஆலப்புழா": "alappuzha", "अलप्पुझा": "alappuzha",
    # Mumbai
    "bombay": "mumbai", "jnpt": "nhava sheva", "sassoon dock": "sassoon",
    "मुंबई": "mumbai", "बम्बई": "mumbai", "மும்பை": "mumbai", "മുംബൈ": "mumbai",
    "ముంబై": "mumbai", "মুম্বাই": "mumbai", "મુંબઈ": "mumbai", "ಮುಂಬೈ": "mumbai",
    "रत्नागिरी": "ratnagiri", "मालवण": "malvan", "अलिबाग": "alibaug",
    # Chennai
    "madras": "chennai", "चेन्नई": "chennai", "मद्रास": "chennai",
    "சென்னை": "chennai", "சென்னையில்": "chennai", "ചെന്നൈ": "chennai",
    "చెన్నై": "chennai", "চেন্নাই": "chennai", "ચેન્નાઈ": "chennai", "ಚೆನ್ನೈ": "chennai",
    "காசிமேடு": "kasimedu", "எண்ணூர்": "ennore",
    # Tuticorin / Thoothukudi
    "தூத்துக்குடி": "tuticorin", "தூத்துக்குடியில்": "tuticorin", "तूतीकोरिन": "tuticorin",
    "തൂത്തുക്കുടി": "tuticorin", "தூத்துக்குடி துறைமுகம்": "tuticorin",
    # Kanyakumari
    "cape comorin": "kanyakumari", "கன்னியாகுமரி": "kanyakumari", "कन्याकुमारी": "kanyakumari",
    "കന്യാകുമാരി": "kanyakumari", "కన్యాకుమారి": "kanyakumari",
    # Rameswaram
    "rameswaram": "rameshwaram", "ராமேஸ்வரம்": "rameshwaram", "रामेश्वरम": "rameshwaram", "രാമേശ്വരം": "rameshwaram",
    # Visakhapatnam / Vizag
    "विशाखापट्टनम": "visakhapatnam", "वाइजाग": "visakhapatnam", "விசாகப்பட்டினம்": "visakhapatnam",
    "విశాఖపట్నం": "visakhapatnam", "వైజాగ్": "visakhapatnam", "বিশাখাপত্তনম": "visakhapatnam",
    "కాకినాడ": "kakinada", "काकीनाडा": "kakinada", "మచిలీపట్నం": "machilipatnam", "కృష్ణపట్నం": "krishnapatnam",
    # Goa
    "panjim": "panaji", "vasco": "mormugao", "vasco da gama": "mormugao",
    "गोवा": "goa", "पणजी": "panaji", "கோவா": "goa", "ഗോവ": "goa", "గోవా": "goa", "গোয়া": "goa", "ગોવા": "goa",
    # Mangalore & Malpe
    "new mangalore": "mangalore", "mangaluru": "mangalore", "udupi": "malpe",
    "मंगलौर": "mangalore", "ಮಂಗಳೂರು": "mangalore", "മംഗലാപുരം": "mangalore", "மங்களூர்": "mangalore",
    "ಕಾರವಾರ": "karwar", "कारवार": "karwar", "ಮಲ್ಪೆ": "malpe",
    # Kolkata & Bengal Coast
    "calcutta": "kolkata", "कोलकाता": "kolkata", "कलकत्ता": "kolkata",
    "কলকাতা": "kolkata", "হলদিয়া": "haldia",
    "দীঘা": "digha", "दीघा": "digha", "সুন্দরবন": "sundarbans", "सुंदरवन": "sundarbans",
    # Odisha
    "paradeep": "paradip", "पारादीप": "paradip", "পারাদীপ": "paradip", "ପାରାଦ୍ୱୀପ": "paradip",
    "धामरा": "dhamra", "ଧାମରା": "dhamra", "पूरी": "puri", "पुरी": "puri", "ପୁରୀ": "puri",
    # Gujarat
    "वेरावल": "veraval", "વેરાવળ": "veraval", "વેરાવલ": "veraval",
    "पोरबंदर": "porbandar", "પોરબંદર": "porbandar", "कंडला": "kandla", "કંડલા": "kandla",
    "ओखा": "okha", "ઓખા": "okha", "मुंद्रा": "mundra", "મુંદ્રા": "mundra",
    "kand": "kandla", "kandla port": "kandla",
    # Compound & Transliterated Port Queries
    "mumbai bandar": "mumbai", "mumbai port": "mumbai", "bombay port": "mumbai",
    "kochi port": "kochi", "cochin port": "kochi", "chennai port": "chennai",
    "odisha port": "paradip", "odisha ports": "paradip", "gujarat port": "kandla",
    "gujarat ports": "kandla", "kerala port": "kochi", "kerala ports": "kochi",
    "tamil nadu port": "chennai", "tamil nadu ports": "chennai",
    "maharashtra port": "mumbai", "maharashtra ports": "mumbai",
    # Island Territories
    "लक्षद्वीप": "lakshadweep", "ലക്ഷദ്വീപ്": "lakshadweep",
    "कावारत्ती": "kavaratti", "കവരത്തി": "kavaratti", "மினிகாய்": "minicoy",
    "अंडमान": "andaman", "पोर्ट ब्लेयर": "port blair",
    "அந்தமான்": "andaman", "പോർട്ട് ബ്ലെയർ": "port blair",
    # Puducherry
    "pondicherry": "puducherry", "புதுச்சேரி": "puducherry", "பாண்டிச்சேரி": "puducherry", "पुडुचेरी": "puducherry"
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

def find_nearest_port(lat: float, lon: float) -> Tuple[Optional[Dict[str, any]], float]:
    """Finds the closest port in COASTAL_PORT_REGISTRY to (lat, lon) and its distance in km."""
    closest = None
    min_dist = float("inf")
    for key, info in COASTAL_PORT_REGISTRY.items():
        p_lat = info.get("lat")
        p_lon = info.get("lon")
        if p_lat is None or p_lon is None:
            continue
        d = haversine_distance_km(lat, lon, p_lat, p_lon)
        if d < min_dist:
            min_dist = d
            closest = {**info, "id": key}
    return closest, min_dist

def resolve_location_name(query_text: str) -> Optional[Dict[str, any]]:
    """
    Matches location names mentioned in natural query text against the coastal port registry,
    or parses explicit coordinates in various formats (e.g. '9.85, 76.15', '9.85°N, 76.15°E',
    'Lat 9.85 Lon 76.15', '9.85N 76.15E').
    Supports multilingual English, Hindi, Tamil, Malayalam, Telugu, Bengali, Gujarati, Kannada, Marathi names.
    """
    if not query_text:
        return None

    clean_text = query_text.strip()
    q_lower = clean_text.lower()

    # 1. Advanced Multiformat Coordinate Extraction
    # Pattern A: Labeled Lat/Lon e.g. "Lat: 9.9656, Lon: 76.2425" or "Latitude 9.96 Longitude 76.24"
    labeled_match = re.search(
        r"(?:lat(?:itude)?\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)\s*(?:°\s*)?([NSns])?)[,\s/]+(?:lon(?:gitude)?\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)\s*(?:°\s*)?([EWew])?)",
        q_lower, re.IGNORECASE
    )
    if labeled_match:
        try:
            lat = float(labeled_match.group(1))
            if labeled_match.group(2) and labeled_match.group(2).upper() == "S":
                lat = -lat
            lon = float(labeled_match.group(3))
            if labeled_match.group(4) and labeled_match.group(4).upper() == "W":
                lon = -lon
            if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                nearest_port, dist_km = find_nearest_port(lat, lon)
                port_ref = f"near {nearest_port['name']} ({dist_km:.1f} km)" if nearest_port else "Offshore EEZ"
                return {
                    "name": f"Offshore Waypoint ({lat:.4f}°N, {lon:.4f}°E - {port_ref})",
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "state": nearest_port["state"] if nearest_port else "Offshore EEZ",
                    "region": nearest_port["region"] if nearest_port else "Indian Ocean",
                    "matched_keyword": "coordinates_labeled"
                }
        except (ValueError, IndexError):
            pass

    # Pattern B: Degrees with cardinal directions e.g. "9.9656°N, 76.2425°E" or "9.96N 76.24E"
    cardinal_match = re.search(
        r"([+-]?\d+(?:\.\d+)?)\s*(?:°\s*)?([NSns])\s*[,/ ]+\s*([+-]?\d+(?:\.\d+)?)\s*(?:°\s*)?([EWew])",
        q_lower, re.IGNORECASE
    )
    if cardinal_match:
        try:
            lat = float(cardinal_match.group(1))
            if cardinal_match.group(2).upper() == "S":
                lat = -lat
            lon = float(cardinal_match.group(3))
            if cardinal_match.group(4).upper() == "W":
                lon = -lon
            if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                nearest_port, dist_km = find_nearest_port(lat, lon)
                port_ref = f"near {nearest_port['name']} ({dist_km:.1f} km)" if nearest_port else "Offshore EEZ"
                return {
                    "name": f"Offshore Waypoint ({lat:.4f}°N, {lon:.4f}°E - {port_ref})",
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "state": nearest_port["state"] if nearest_port else "Offshore EEZ",
                    "region": nearest_port["region"] if nearest_port else "Indian Ocean",
                    "matched_keyword": "coordinates_cardinal"
                }
        except (ValueError, IndexError):
            pass

    # Pattern C: Standard comma/slash separated floating point pair anywhere in query e.g. "at 9.9656, 76.2425"
    coord_match = re.search(r"([+-]?\d{1,2}(?:\.\d+)?)\s*[,/]\s*([+-]?\d{1,3}(?:\.\d+)?)", clean_text)
    if coord_match:
        try:
            lat = float(coord_match.group(1))
            lon = float(coord_match.group(2))
            if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                nearest_port, dist_km = find_nearest_port(lat, lon)
                port_ref = f"near {nearest_port['name']} ({dist_km:.1f} km)" if nearest_port else "Offshore EEZ"
                return {
                    "name": f"Offshore Waypoint ({lat:.4f}°N, {lon:.4f}°E - {port_ref})",
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "state": nearest_port["state"] if nearest_port else "Offshore EEZ",
                    "region": nearest_port["region"] if nearest_port else "Indian Ocean",
                    "matched_keyword": "coordinates_pair"
                }
        except (ValueError, IndexError):
            pass

    # Pattern D: Space-separated floating point numbers in Indian marine domain
    space_coords = re.search(r"\b(\d{1,2}\.\d+)\s+(\d{2,3}\.\d+)\b", clean_text)
    if space_coords:
        try:
            lat = float(space_coords.group(1))
            lon = float(space_coords.group(2))
            if 0.0 <= lat <= 35.0 and 60.0 <= lon <= 100.0:
                nearest_port, dist_km = find_nearest_port(lat, lon)
                port_ref = f"near {nearest_port['name']} ({dist_km:.1f} km)" if nearest_port else "Offshore EEZ"
                return {
                    "name": f"Offshore Waypoint ({lat:.4f}°N, {lon:.4f}°E - {port_ref})",
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "state": nearest_port["state"] if nearest_port else "Offshore EEZ",
                    "region": nearest_port["region"] if nearest_port else "Indian Ocean",
                    "matched_keyword": "coordinates_space"
                }
        except (ValueError, IndexError):
            pass

    # 2. Check Synonyms & Multilingual Vernacular Mappings (Longest string first)
    sorted_synonyms = sorted(PORT_SYNONYMS.keys(), key=lambda k: -len(k))
    for syn in sorted_synonyms:
        if syn in q_lower or syn in clean_text:
            canonical_key = PORT_SYNONYMS[syn]
            if canonical_key in COASTAL_PORT_REGISTRY:
                data = COASTAL_PORT_REGISTRY[canonical_key].copy()
                data["matched_keyword"] = syn
                return data

    # 3. Check Canonical Registry Keys (Longest string first)
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

def get_west_coast_lon(lat: float) -> float:
    """Returns the approximate coastline longitude along India's West Coast for a given latitude."""
    if lat < 8.08:
        return 77.55
    if lat <= 8.8:
        return 77.55 - ((lat - 8.08) / 0.72) * (77.55 - 76.58)
    if lat <= 9.97:
        return 76.58 - ((lat - 8.8) / 1.17) * (76.58 - 76.24)
    if lat <= 11.25:
        return 76.24 - ((lat - 9.97) / 1.28) * (76.24 - 75.77)
    if lat <= 12.92:
        return 75.77 - ((lat - 11.25) / 1.67) * (75.77 - 74.82)
    if lat <= 14.81:
        return 74.82 - ((lat - 12.92) / 1.89) * (74.82 - 74.13)
    if lat <= 15.42:
        return 74.13 - ((lat - 14.81) / 0.61) * (74.13 - 73.80)
    if lat <= 16.99:
        return 73.80 - ((lat - 15.42) / 1.57) * (73.80 - 73.28)
    if lat <= 18.94:
        return 73.28 - ((lat - 16.99) / 1.95) * (73.28 - 72.84)
    if lat <= 20.0:
        return 72.82 - ((lat - 18.9) / 1.1) * (72.82 - 72.70)
    if lat <= 21.0:
        return 72.70 - ((lat - 20.0) / 1.0) * (72.70 - 72.40)
    if lat <= 22.5:
        return 69.50
    if lat <= 24.5:
        return 68.60
    return 67.5

def get_east_coast_lon(lat: float) -> float:
    """Returns the approximate coastline longitude along India's East Coast for a given latitude."""
    if lat < 8.08:
        return 77.55
    if lat <= 8.8:
        return 77.55 + ((lat - 8.08) / 0.72) * (78.15 - 77.55)
    if lat <= 9.3:
        return 78.15 + ((lat - 8.8) / 0.5) * (79.31 - 78.15)
    if lat <= 10.8:
        return 79.31 + ((lat - 9.3) / 1.5) * (79.85 - 79.31)
    if lat <= 11.9:
        return 79.85 - ((lat - 10.8) / 1.1) * (79.85 - 79.80)
    if lat <= 13.1:
        return 79.80 + ((lat - 11.9) / 1.2) * (80.28 - 79.80)
    if lat <= 14.2:
        return 80.28 - ((lat - 13.1) / 1.1) * (80.28 - 80.05)
    if lat <= 15.8:
        return 80.05 + ((lat - 14.2) / 1.6) * (80.85 - 80.05)
    if lat <= 17.7:
        return 80.85 + ((lat - 15.8) / 1.9) * (83.22 - 80.85)
    if lat <= 19.8:
        return 83.22 + ((lat - 17.7) / 2.1) * (85.83 - 83.22)
    if lat <= 20.3:
        return 85.83 + ((lat - 19.8) / 0.5) * (86.67 - 85.83)
    if lat <= 22.5:
        return 86.67 + ((lat - 20.3) / 2.2) * (88.80 - 86.67)
    return 89.2

