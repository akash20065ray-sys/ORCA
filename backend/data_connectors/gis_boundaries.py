from typing import Dict, List, Any, Tuple
from backend.data_connectors.base import BaseDataConnector
from backend.database.models import MarineZone
from backend.database.spatial_index import spatial_index
from backend.utils.geo import haversine_distance_km, km_to_nautical_miles

class GISBoundariesConnector(BaseDataConnector):
    """
    Supplies PostGIS spatial geometries for:
    - International Maritime Boundary Line (IMBL) Geofences (India-Sri Lanka, India-Pakistan)
    - Marine Protected Areas (MPA) & Coral Biospheres
    - Indian Exclusive Economic Zone (EEZ)
    - Restricted Naval & Coastal Security Defense Corridors
    """
    def __init__(self):
        super().__init__(name="Maritime GIS, PostGIS & IMBL Geofencing Repository", source_id="gis_boundaries", ttl_seconds=86400)
        self.zones: List[MarineZone] = self._load_zones()
        spatial_index.set_zones(self.zones)

    def _load_zones(self) -> List[MarineZone]:
        return [
            # 1. IMBL Geofence — India / Sri Lanka Maritime Boundary (Palk Strait & Gulf of Mannar)
            MarineZone(
                id="ZONE-IMBL-01",
                name="International Maritime Boundary Line (IMBL) — India/Sri Lanka Buffer",
                zone_type="IMBL_GEOFENCE",
                state_region="Palk Strait / Gulf of Mannar",
                risk_multiplier=3.0,
                is_restricted=True,
                description="International boundary line between India and Sri Lanka. Crossing beyond boundary results in apprehension by Sri Lankan Navy. Maintain at least 5 NM safety margin.",
                coordinates=[
                    [79.25, 9.00],
                    [79.85, 9.50],
                    [80.30, 10.30],
                    [79.80, 10.40],
                    [79.25, 9.00]
                ]
            ),
            # 2. IMBL Geofence — India / Pakistan Maritime Boundary (Sir Creek / Kutch Sector)
            MarineZone(
                id="ZONE-IMBL-02",
                name="International Maritime Boundary Line (IMBL) — India/Pakistan Kutch Buffer",
                zone_type="IMBL_GEOFENCE",
                state_region="Gulf of Kutch / Sir Creek",
                risk_multiplier=3.0,
                is_restricted=True,
                description="International maritime border sector near Sir Creek. Crossing strictly prohibited by Indian Coast Guard and BSF Water Wing.",
                coordinates=[
                    [67.80, 23.00],
                    [68.40, 23.00],
                    [68.40, 23.80],
                    [67.80, 23.80],
                    [67.80, 23.00]
                ]
            ),
            # 3. Gulf of Mannar Marine National Park (21 Islands Coral Biosphere)
            MarineZone(
                id="ZONE-MPA-01",
                name="Gulf of Mannar Marine National Park",
                zone_type="MPA",
                state_region="Tamil Nadu",
                risk_multiplier=1.8,
                is_restricted=True,
                description="Ecologically sensitive coral reef biosphere consisting of 21 islands. Commercial trawling and motorized bottom fishing strictly prohibited under Wildlife Protection Act.",
                coordinates=[
                    [78.10, 8.75],
                    [79.25, 9.15],
                    [79.40, 9.35],
                    [78.90, 9.40],
                    [78.10, 8.75]
                ]
            ),
            # 4. Sundarbans Marine Delta & Biosphere
            MarineZone(
                id="ZONE-MPA-02",
                name="Sundarbans Marine Delta & Biosphere",
                zone_type="MPA",
                state_region="West Bengal",
                risk_multiplier=1.7,
                is_restricted=True,
                description="UNESCO World Heritage mangrove delta with complex estuarine channels, tiger reserve, and core crocodile sanctuaries.",
                coordinates=[
                    [88.20, 21.50],
                    [89.10, 21.50],
                    [89.10, 22.10],
                    [88.20, 22.10],
                    [88.20, 21.50]
                ]
            ),
            # 5. Gahirmatha Marine Sanctuary (Olive Ridley Turtle Sanctuary)
            MarineZone(
                id="ZONE-MPA-03",
                name="Gahirmatha Marine Sanctuary",
                zone_type="MPA",
                state_region="Odisha",
                risk_multiplier=2.0,
                is_restricted=True,
                description="Mass nesting sanctuary for endangered Olive Ridley sea turtles. Mechanized fishing prohibited within 20 km of shoreline from Nov to May.",
                coordinates=[
                    [86.70, 20.40],
                    [87.20, 20.40],
                    [87.20, 20.90],
                    [86.70, 20.90],
                    [86.70, 20.40]
                ]
            ),
            # 6. Malvan Marine Sanctuary
            MarineZone(
                id="ZONE-MPA-04",
                name="Malvan Marine Sanctuary",
                zone_type="MPA",
                state_region="Maharashtra",
                risk_multiplier=1.5,
                is_restricted=True,
                description="Sindhudurg coastal protected reef zone with coral outcrops, pearl oysters, and marine fauna reserves.",
                coordinates=[
                    [73.40, 15.95],
                    [73.55, 15.95],
                    [73.55, 16.10],
                    [73.40, 16.10],
                    [73.40, 15.95]
                ]
            ),
            # 7. Mumbai Naval Offshore Security Perimeter
            MarineZone(
                id="ZONE-SEC-06",
                name="Mumbai Naval Offshore Security Perimeter",
                zone_type="RESTRICTED_NAVAL",
                state_region="Maharashtra",
                risk_multiplier=2.2,
                is_restricted=True,
                description="Naval operational zone and anchorage security corridor near Bombay High and harbour approaches.",
                coordinates=[
                    [72.60, 18.80],
                    [72.85, 18.80],
                    [72.85, 19.10],
                    [72.60, 19.10],
                    [72.60, 18.80]
                ]
            ),
            # 8. Indian EEZ
            MarineZone(
                id="ZONE-EEZ-07",
                name="Indian Exclusive Economic Zone (EEZ) — Peninsular Sector",
                zone_type="EEZ",
                state_region="National Maritime Boundary",
                risk_multiplier=1.0,
                is_restricted=False,
                description="200 nautical mile sovereign exclusive economic zone covering 2.37 million sq km of territorial and maritime waters.",
                coordinates=[
                    [68.0, 7.0],
                    [88.0, 7.0],
                    [88.0, 22.0],
                    [68.0, 22.0],
                    [68.0, 7.0]
                ]
            )
        ]

    def fetch_data(self) -> List[MarineZone]:
        return self.zones

    def check_geofence_proximity(self, lat: float, lon: float, warning_threshold_nm: float = 10.0) -> List[Dict[str, Any]]:
        """
        Calculates proximity alerts to IMBL and restricted Marine Protected Areas.
        """
        alerts = []
        for zone in self.zones:
            if not zone.is_restricted:
                continue
            # Calculate distance to polygon center / closest edge
            avg_lon = sum(p[0] for p in zone.coordinates) / len(zone.coordinates)
            avg_lat = sum(p[1] for p in zone.coordinates) / len(zone.coordinates)
            dist_km = haversine_distance_km(lat, lon, avg_lat, avg_lon)
            dist_nm = km_to_nautical_miles(dist_km)

            # Check if specifically inside this zone or within the warning threshold
            is_inside_this_zone = any(z.id == zone.id for z in spatial_index.find_intersecting_zones(lat, lon))
            if dist_nm <= warning_threshold_nm or is_inside_this_zone:
                alerts.append({
                    "zone_id": zone.id,
                    "zone_name": zone.name,
                    "zone_type": zone.zone_type,
                    "distance_nm": round(dist_nm, 1),
                    "warning_level": "CRITICAL_BREACH" if (is_inside_this_zone or dist_nm <= 3.0) else "PROXIMITY_WARNING",
                    "description": zone.description,
                    "recommended_action": f"Turn vessel around immediately. You are {dist_nm:.1f} NM from {zone.name}." if is_inside_this_zone else f"Maintain safety margin. You are {dist_nm:.1f} NM from {zone.name}."
                })
        return alerts

    def get_all_zones_geojson(self) -> Dict[str, Any]:
        """Returns standard GeoJSON FeatureCollection for frontend Leaflet rendering."""
        features = []
        for z in self.zones:
            features.append({
                "type": "Feature",
                "properties": {
                    "id": z.id,
                    "name": z.name,
                    "zone_type": z.zone_type,
                    "state_region": z.state_region,
                    "is_restricted": z.is_restricted,
                    "description": z.description,
                    "risk_multiplier": z.risk_multiplier
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [z.coordinates]
                }
            })
        return {
            "type": "FeatureCollection",
            "features": features
        }

gis_boundaries_connector = GISBoundariesConnector()
