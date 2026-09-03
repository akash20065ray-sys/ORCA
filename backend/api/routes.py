from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.route_engine import route_engine
from backend.database.models import CandidateRoute
from backend.utils.geo import resolve_location_name, COASTAL_PORT_REGISTRY

router = APIRouter(prefix="/api/routes", tags=["Marine Routing"])

class RouteRequest(BaseModel):
    origin: str # Port name or "lat,lon"
    destination: str
    vessel_speed_knots: Optional[float] = 12.0

@router.post("/analyze", response_model=List[CandidateRoute])
async def analyze_marine_route(req: RouteRequest):
    orig_res = resolve_location_name(req.origin)
    dest_res = resolve_location_name(req.destination)

    if not orig_res:
        raise HTTPException(status_code=400, detail=f"Could not resolve departure port '{req.origin}'.")
    if not dest_res:
        raise HTTPException(status_code=400, detail=f"Could not resolve destination port '{req.destination}'.")

    routes = route_engine.calculate_marine_routes(
        orig_lat=orig_res["lat"],
        orig_lon=orig_res["lon"],
        dest_lat=dest_res["lat"],
        dest_lon=dest_res["lon"],
        origin_name=orig_res["name"],
        destination_name=dest_res["name"],
        vessel_speed_knots=req.vessel_speed_knots or 12.0
    )
    return routes
