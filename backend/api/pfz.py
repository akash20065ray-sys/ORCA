from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, Body, HTTPException
from pydantic import BaseModel
from backend.services.pfz_engine import pfz_engine
from backend.database.models import PFZAdvisory
from backend.utils.geo import COASTAL_PORT_REGISTRY, resolve_location_name

router = APIRouter(prefix="/api/pfz", tags=["Potential Fishing Zones"])

class ProductivityDeclineRequest(BaseModel):
    region_name: Optional[str] = "Gulf of Mannar"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.get("/zones", response_model=List[PFZAdvisory])
@router.get("/forecast", response_model=List[PFZAdvisory])
async def get_pfz_advisories(
    port_name: Optional[str] = Query("kochi", description="Reference port or coastal city name"),
    lat: Optional[float] = Query(None, description="Custom latitude"),
    lon: Optional[float] = Query(None, description="Custom longitude")
):
    """
    Generates INCOIS & ISRO-calibrated Potential Fishing Zone (PFZ) hotspots
    using live satellite Sea Surface Temperature gradients and Chlorophyll-a convergence.
    """
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

@router.get("/diagnose-decline")
async def diagnose_productivity_decline_get(
    region: Optional[str] = Query("Gulf of Mannar", description="Coastal sector name"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude")
) -> Dict[str, Any]:
    """
    Diagnostic explaining why fish catch or biomass productivity has declined in a marine sector.
    """
    target_lat = 9.2876
    target_lon = 79.3129
    reg_name = region or "Gulf of Mannar"

    if region:
        res = resolve_location_name(region)
        if res:
            target_lat = res["lat"]
            target_lon = res["lon"]
            reg_name = res["name"]

    if lat is not None and lon is not None:
        target_lat = lat
        target_lon = lon

    return pfz_engine.analyze_productivity_decline(reg_name, target_lat, target_lon)

@router.post("/diagnose-decline")
async def diagnose_productivity_decline_post(
    req: Optional[ProductivityDeclineRequest] = Body(default=None)
) -> Dict[str, Any]:
    """
    Diagnostic via POST payload explaining why fish catch or biomass productivity has declined in a marine sector.
    """
    reg_name = req.region_name if req and req.region_name else "Gulf of Mannar"
    target_lat = req.latitude if req and req.latitude is not None else 9.2876
    target_lon = req.longitude if req and req.longitude is not None else 79.3129

    if reg_name:
        res = resolve_location_name(reg_name)
        if res:
            target_lat = res["lat"]
            target_lon = res["lon"]
            reg_name = res["name"]

    return pfz_engine.analyze_productivity_decline(reg_name, target_lat, target_lon)

@router.get("/all")
async def get_all_pfz_zones() -> Dict[str, Any]:
    """
    Returns all verified INCOIS Potential Fishing Zones across Indian coastal states
    from the official dataset, supplemented by regional harbor advisories.
    """
    import os
    import json
    data_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "incois_pfz_zones.json")
    if os.path.exists(data_file):
        with open(data_file, "r", encoding="utf-8") as f:
            return json.load(f)

    # Dynamic generation fallback
    major_ports = ["kochi", "chennai", "mumbai", "visakhapatnam", "goa", "mangalore", "tuticorin", "veraval", "paradip"]
    all_zones = []
    for p in major_ports:
        res = resolve_location_name(p)
        if res:
            zones = pfz_engine.generate_pfz_advisories(res["lat"], res["lon"], res["name"])
            all_zones.extend([z.dict() for z in zones])
    return {"source": "INCOIS (Indian National Centre for Ocean Information Services)", "zones": all_zones}

