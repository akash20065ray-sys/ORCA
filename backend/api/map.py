from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query
from backend.data_connectors.gis_boundaries import gis_boundaries_connector
from backend.data_connectors.ocean_sst_chl import ocean_sst_chl_connector
from backend.data_connectors.advisories import marine_advisories_connector, ADVISORY_REGIONS
from backend.data_connectors.in_situ import in_situ_connector
from backend.utils.geo import COASTAL_PORT_REGISTRY

router = APIRouter(prefix="/api/map", tags=["Geospatial & Map Layers"])

@router.get("/layers")
async def get_map_layers(
    center_lat: float = Query(13.0827, description="Center latitude"),
    center_lon: float = Query(80.2707, description="Center longitude"),
    radius_deg: float = Query(2.5, description="Bounding radius in degrees")
) -> Dict[str, Any]:
    """
    Returns full spatial layers for Leaflet interactive rendering:
    - GIS Zones (MPAs, EEZ, Naval perimeters)
    - Ocean SST / Chlorophyll spatial grid
    - Active hazard advisories with geo-coordinates
    - Coastal ports and harbors
    - Deep sea and coastal buoys
    """
    # 1. GIS Zones GeoJSON
    zones_geojson = gis_boundaries_connector.get_all_zones_geojson()

    # 2. Regional SST & Chlorophyll Heatmap Grid
    sst_grid = ocean_sst_chl_connector.get_regional_grid(center_lat, center_lon, radius_deg=radius_deg, step=0.35)

    # 3. Active Hazard Bulletins with Representative Coordinates
    hazards = marine_advisories_connector.fetch_data()
    region_coords = {r["region"]: (r["lat"], r["lon"]) for r in ADVISORY_REGIONS}
    hazard_list = []
    for h in hazards:
        hd = h.model_dump()
        if h.region in region_coords:
            hd["lat"], hd["lon"] = region_coords[h.region]
        else:
            hd["lat"], hd["lon"] = (center_lat, center_lon)
        hazard_list.append(hd)

    # 4. Coastal Port Points GeoJSON
    port_features = []
    for k, p in COASTAL_PORT_REGISTRY.items():
        port_features.append({
            "type": "Feature",
            "properties": {
                "id": k,
                "name": p["name"],
                "state": p["state"],
                "region": p["region"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [p["lon"], p["lat"]]
            }
        })

    # 5. In-situ Buoy Points GeoJSON
    buoy_features = []
    for b in in_situ_connector.buoys:
        buoy_features.append({
            "type": "Feature",
            "properties": {
                "id": b["id"],
                "name": b["name"],
                "region": b["region"],
                "depth_m": b["depth_m"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [b["lon"], b["lat"]]
            }
        })

    return {
        "center": {"lat": center_lat, "lon": center_lon},
        "gis_zones": zones_geojson,
        "sst_grid": sst_grid,
        "hazards": hazard_list,
        "ports": {
            "type": "FeatureCollection",
            "features": port_features
        },
        "buoys": {
            "type": "FeatureCollection",
            "features": buoy_features
        }
    }
