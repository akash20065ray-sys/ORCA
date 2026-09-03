import time
from typing import Dict, Any, List
from backend.utils.logger import logger
from backend.database.spatial_index import spatial_index
from backend.data_connectors.gis_boundaries import gis_boundaries_connector
from backend.services.route_engine import route_engine
from backend.utils.geo import find_nearest_port, haversine_distance_km, COASTAL_PORT_REGISTRY

class GeospatialAnalysisAgent:
    """
    Agent 7: Geospatial Analysis Agent
    Executes PostGIS-compatible spatial operations, IMBL geofencing, restricted zone proximity,
    MPA sanctuary checks, and deterministic obstacle-avoiding marine routing.
    """
    def __init__(self):
        self.name = "geospatial_analysis_agent"
        self.title = "Geospatial Analysis Agent"

    def execute(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        coords = plan.get("coordinates", {})
        lat = coords.get("latitude", 13.0827)
        lon = coords.get("longitude", 80.2707)
        loc_name = plan.get("target_location", "Coast")

        logger.info(f"[{self.title}] Performing GIS boundary queries and spatial analysis for Lat: {lat}, Lon: {lon}")

        # 1. Check intersecting / containing zones
        intersecting = spatial_index.find_intersecting_zones(lat, lon)
        is_inside_restricted = any(z.is_restricted for z in intersecting)

        # 2. Check IMBL Geofence Proximity & Warnings
        geofence_alerts = gis_boundaries_connector.check_geofence_proximity(lat, lon, warning_threshold_nm=12.0)

        # 3. Check nearby zones within 120km
        nearby_zones_raw = spatial_index.find_nearby_zones(lat, lon, radius_km=120.0)
        nearby_zones = []
        for z, dist in nearby_zones_raw:
            nearby_zones.append({
                "zone_id": z.id,
                "zone_name": z.name,
                "zone_type": z.zone_type,
                "distance_km": dist,
                "is_restricted": z.is_restricted,
                "description": z.description
            })

        # 4. Nearest Harbor
        nearest_port, port_dist = find_nearest_port(lat, lon)

        # 5. Route analysis if requested
        candidate_routes = []
        if plan.get("requires_routing", False) or plan.get("intent") == "marine_routing":
            endpoints = plan.get("route_endpoints") or {}
            orig = endpoints.get("origin")
            dest = endpoints.get("destination")

            orig_lat = orig["lat"] if orig else lat
            orig_lon = orig["lon"] if orig else lon
            orig_name = orig["name"] if orig else loc_name

            dest_lat = dest["lat"] if dest else 15.4187 # Default Goa
            dest_lon = dest["lon"] if dest else 73.8010
            dest_name = dest["name"] if dest else "Goa (Mormugao)"

            routes = route_engine.calculate_marine_routes(
                orig_lat=orig_lat,
                orig_lon=orig_lon,
                dest_lat=dest_lat,
                dest_lon=dest_lon,
                origin_name=orig_name,
                destination_name=dest_name
            )
            candidate_routes = [r.model_dump() for r in routes]

        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "agent": self.name,
            "status": "completed",
            "duration_ms": duration_ms,
            "summary": f"Spatial query complete. Nearest port: {nearest_port['name'] if nearest_port else 'N/A'} ({port_dist:.1f} km). {len(geofence_alerts)} geofence alerts, {len(nearby_zones)} zones nearby.",
            "is_inside_restricted_zone": is_inside_restricted,
            "geofence_alerts": geofence_alerts,
            "intersecting_zones": [z.model_dump() for z in intersecting],
            "nearby_marine_zones": nearby_zones,
            "nearest_port": nearest_port,
            "nearest_port_distance_km": port_dist,
            "candidate_routes": candidate_routes,
            "has_routes": len(candidate_routes) > 0
        }

geospatial_analysis_agent = GeospatialAnalysisAgent()
