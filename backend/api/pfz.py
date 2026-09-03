from typing import List, Optional
from fastapi import APIRouter, Query
from backend.services.pfz_engine import pfz_engine
from backend.database.models import PFZAdvisory
from backend.utils.geo import COASTAL_PORT_REGISTRY, resolve_location_name

router = APIRouter(prefix="/api/pfz", tags=["Potential Fishing Zones"])

@router.get("/zones", response_model=List[PFZAdvisory])
async def get_pfz_advisories(
    port_name: Optional[str] = Query("kochi", description="Reference port or coastal city name"),
    lat: Optional[float] = Query(None, description="Custom latitude"),
    lon: Optional[float] = Query(None, description="Custom longitude")
):
    target_lat = 9.9656 # Kochi
    target_lon = 76.2425
    ref_name = "Cochin Port (Kochi)"

    if port_name:
        resolved = resolve_location_name(port_name)
        if resolved:
            target_lat = resolved["lat"]
            target_lon = resolved["lon"]
            ref_name = resolved["name"]

    if lat is not None and lon is not None:
        target_lat = lat
        target_lon = lon
        ref_name = f"Custom Coordinates ({lat:.2f}, {lon:.2f})"

    return pfz_engine.generate_pfz_advisories(target_lat, target_lon, ref_name)
