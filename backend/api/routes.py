from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.route_engine import route_engine
from backend.database.models import CandidateRoute
from backend.utils.geo import resolve_location_name, COASTAL_PORT_REGISTRY

router = APIRouter(prefix="/api/routes", tags=["Marine Routing"])

class RouteRequest(BaseModel):
    origin: Optional[str] = None
    origin_harbor: Optional[str] = None
    destination: Optional[str] = None
    destination_harbor: Optional[str] = None
    vessel_speed_knots: Optional[float] = 12.0

@router.post("/analyze", response_model=List[CandidateRoute])
@router.post("/optimize", response_model=List[CandidateRoute])
async def analyze_marine_route(req: RouteRequest):
    orig_query = req.origin or req.origin_harbor
    dest_query = req.destination or req.destination_harbor

    if not orig_query:
        raise HTTPException(status_code=400, detail="Missing departure location ('origin' or 'origin_harbor').")
    if not dest_query:
        raise HTTPException(status_code=400, detail="Missing destination location ('destination' or 'destination_harbor').")

    orig_res = resolve_location_name(orig_query)
    dest_res = resolve_location_name(dest_query)

    if not orig_res:
        raise HTTPException(status_code=400, detail=f"Could not resolve departure location '{orig_query}'.")
    if not dest_res:
        raise HTTPException(status_code=400, detail=f"Could not resolve destination location '{dest_query}'.")

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
