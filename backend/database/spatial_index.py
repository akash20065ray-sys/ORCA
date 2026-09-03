import math
from typing import Dict, List, Tuple, Optional
from backend.database.models import MarineZone, HazardAdvisory
from backend.utils.geo import haversine_distance_km

def point_in_polygon(lat: float, lon: float, polygon: List[List[float]]) -> bool:
    """
    Ray-casting algorithm to test if a point (lat, lon) is inside a GeoJSON polygon [[lon, lat], ...].
    """
    num = len(polygon)
    inside = False
    p1x, p1y = polygon[0][0], polygon[0][1] # lon, lat
    for i in range(num + 1):
        p2x, p2y = polygon[i % num][0], polygon[i % num][1]
        if min(p1y, p2y) < lat <= max(p1y, p2y):
            if lon <= max(p1x, p2x):
                if p1y != p2y:
                    xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                if p1x == p2x or lon <= xinters:
                    inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def distance_point_to_polygon_centroid_km(lat: float, lon: float, polygon: List[List[float]]) -> float:
    """Calculates approximate distance from (lat, lon) to polygon centroid."""
    if not polygon:
        return float("inf")
    avg_lon = sum(p[0] for p in polygon) / len(polygon)
    avg_lat = sum(p[1] for p in polygon) / len(polygon)
    return haversine_distance_km(lat, lon, avg_lat, avg_lon)

class SpatialIndex:
    """
    PostGIS-compatible spatial index and query engine.
    """
    def __init__(self):
        self.zones: List[MarineZone] = []
        self.hazards: List[HazardAdvisory] = []

    def set_zones(self, zones: List[MarineZone]):
        self.zones = zones

    def set_hazards(self, hazards: List[HazardAdvisory]):
        self.hazards = hazards

    def find_intersecting_zones(self, lat: float, lon: float) -> List[MarineZone]:
        """Finds any marine zones or MPAs containing the point."""
        intersecting = []
        for zone in self.zones:
            if point_in_polygon(lat, lon, zone.coordinates):
                intersecting.append(zone)
        return intersecting

    def find_nearby_zones(self, lat: float, lon: float, radius_km: float = 100.0) -> List[Tuple[MarineZone, float]]:
        """Finds marine zones within radius_km and returns (zone, distance_km)."""
        results = []
        for zone in self.zones:
            # Check if point is inside or near centroid
            if point_in_polygon(lat, lon, zone.coordinates):
                results.append((zone, 0.0))
            else:
                dist = distance_point_to_polygon_centroid_km(lat, lon, zone.coordinates)
                if dist <= radius_km:
                    results.append((zone, round(dist, 2)))
        results.sort(key=lambda x: x[1])
        return results

    def find_active_hazards_for_region(self, region_name: str, lat: float, lon: float) -> List[HazardAdvisory]:
        """Finds active hazard advisories affecting the given region/coordinates."""
        matches = []
        for h in self.hazards:
            if region_name.lower() in h.region.lower() or h.region.lower() in region_name.lower():
                matches.append(h)
            elif any(zone.lower() in region_name.lower() for zone in h.affected_zones):
                matches.append(h)
        return matches

spatial_index = SpatialIndex()
