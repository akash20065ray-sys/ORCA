from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.services.route_engine import route_engine
from backend.database.models import CandidateRoute, RouteWaypoint
from backend.utils.geo import resolve_location_name, COASTAL_PORT_REGISTRY

router = APIRouter(prefix="/api/routes", tags=["Marine Routing"])

class RouteRequest(BaseModel):
    origin: Optional[str] = None
    origin_harbor: Optional[str] = None
    origin_port: Optional[str] = None
    destination: Optional[str] = None
    destination_harbor: Optional[str] = None
    destination_port: Optional[str] = None
    vessel_speed_knots: Optional[float] = 12.0
    cruising_speed_knots: Optional[float] = None
    vessel_draft_meters: Optional[float] = None

@router.get("/ports")
async def list_available_coastal_ports(
    region: Optional[str] = Query(None, description="Filter by state or coastal region (e.g. Kerala, Maharashtra)")
) -> Dict[str, Any]:
    """
    Returns registered Indian coastal ports, fishing harbors, and anchorages.
    """
    ports = []
    for key, val in COASTAL_PORT_REGISTRY.items():
        if region and region.lower() not in val["state"].lower():
            continue
        ports.append({
            "key": key,
            "name": val["name"],
            "state": val["state"],
            "latitude": val["lat"],
            "longitude": val["lon"]
        })
    return {
        "total_ports": len(ports),
        "ports": ports
    }

@router.post("/analyze", response_model=List[CandidateRoute])
@router.post("/optimize", response_model=List[CandidateRoute])
async def analyze_marine_route(req: RouteRequest):
    """
    Computes optimal and safe sea routes between origin and destination,
    evaluating wave state, wind drift, speed, fuel consumption, and geofencing.
    """
    orig_query = req.origin or req.origin_harbor or req.origin_port
    dest_query = req.destination or req.destination_harbor or req.destination_port

    if not orig_query:
        raise HTTPException(status_code=400, detail="Missing departure location ('origin' or 'origin_harbor' or 'origin_port').")
    if not dest_query:
        raise HTTPException(status_code=400, detail="Missing destination location ('destination' or 'destination_harbor' or 'destination_port').")

    orig_res = resolve_location_name(orig_query)
    dest_res = resolve_location_name(dest_query)

    if not orig_res:
        raise HTTPException(status_code=400, detail=f"Could not resolve departure location '{orig_query}'.")
    if not dest_res:
        raise HTTPException(status_code=400, detail=f"Could not resolve destination location '{dest_query}'.")

    eff_speed = req.cruising_speed_knots or req.vessel_speed_knots or 12.0

    routes = route_engine.calculate_marine_routes(
        orig_lat=orig_res["lat"],
        orig_lon=orig_res["lon"],
        dest_lat=dest_res["lat"],
        dest_lon=dest_res["lon"],
        origin_name=orig_res["name"],
        destination_name=dest_res["name"],
        vessel_speed_knots=eff_speed
    )
    return routes

@router.post("/waypoints")
async def extract_route_waypoints(req: RouteRequest) -> Dict[str, Any]:
    """
    Extracts high-resolution navigational waypoints and steer instructions for onboard GPS navigation.
    """
    routes = await analyze_marine_route(req)
    recommended = next((r for r in routes if "RECOMMENDED" in r.recommendation_verdict), routes[0])
    return {
        "selected_route_id": recommended.route_id,
        "selected_route_name": recommended.route_name,
        "total_distance_nm": recommended.total_distance_nm,
        "safety_score": recommended.safety_score,
        "waypoints_count": len(recommended.waypoints),
        "waypoints": recommended.waypoints
    }

@router.post("/reverse", response_model=List[CandidateRoute])
async def calculate_return_voyage(req: RouteRequest):
    """
    Calculates reverse return voyage from destination back to origin.
    """
    return await analyze_marine_route(RouteRequest(
        origin=req.destination or req.destination_harbor,
        destination=req.origin or req.origin_harbor,
        vessel_speed_knots=req.vessel_speed_knots
    ))
