from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from backend.services.risk_engine import MarineRiskEngine
from backend.data_connectors.open_meteo import open_meteo_connector
from backend.data_connectors.advisories import marine_advisories_connector
from backend.database.spatial_index import spatial_index
from backend.utils.geo import resolve_location_name
from backend.utils.logger import logger

router = APIRouter(prefix="/api/safety", tags=["Marine Safety Assessment"])

class SafetyAssessRequest(BaseModel):
    port_name: Optional[str] = "kochi"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    vessel_type: Optional[str] = "artisanal_fishing_craft" # deep_sea_trawler, mechanized_boat, coastal_patrol

def _evaluate_safety_core(
    port_name: Optional[str] = "kochi",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    vessel_type: Optional[str] = "artisanal_fishing_craft"
) -> Dict[str, Any]:
    target_lat = 9.9656
    target_lon = 76.2425
    ref_name = "Cochin Port (Kochi, Kerala)"

    if port_name:
        res = resolve_location_name(port_name)
        if res:
            target_lat = res["lat"]
            target_lon = res["lon"]
            ref_name = res["name"]

    if lat is not None and lon is not None:
        target_lat = lat
        target_lon = lon
        ref_name = f"Custom Position ({lat:.3f}°N, {lon:.3f}°E)"

    # 1. Fetch live ocean weather telemetry
    weather_data = open_meteo_connector.fetch_data(target_lat, target_lon, forecast_hours=12)
    curr = weather_data.get("current", {})
    wave_h = curr.get("wave_height_m", 1.2)
    swell_h = curr.get("swell_wave_height_m", 1.0)
    wind_spd = curr.get("wind_speed_kts", 14.0)
    wind_gst = curr.get("wind_gusts_kts", 18.0)

    # 2. Check active hazards
    all_hazards = marine_advisories_connector.fetch_data()

    # 3. Check spatial zones
    intersecting = spatial_index.find_intersecting_zones(target_lat, target_lon)
    is_restricted = any(z.is_restricted for z in intersecting)

    # 4. Evaluate deterministic risk score
    assessment = MarineRiskEngine.evaluate_risk(
        wave_height_m=wave_h,
        swell_wave_m=swell_h,
        wind_speed_kts=wind_spd,
        wind_gusts_kts=wind_gst,
        active_hazards=all_hazards,
        is_restricted_zone=is_restricted,
        vessel_type=vessel_type or "artisanal_fishing_craft"
    )

    # Compute Douglas Sea State index
    douglas_state = 2 # Smooth
    if wave_h >= 4.0: douglas_state = 6 # Very rough
    elif wave_h >= 2.5: douglas_state = 5 # Rough
    elif wave_h >= 1.25: douglas_state = 4 # Moderate
    elif wave_h >= 0.5: douglas_state = 3 # Slight

    # Compute Beaufort Force
    beaufort_force = int(round((wind_spd / 1.6) ** (2/3))) if wind_spd > 0 else 0
    beaufort_force = min(12, max(0, beaufort_force))

    safety_score = assessment.safety_score if assessment.safety_score is not None else max(0, min(100, 100 - assessment.risk_score))
    overall_risk_str = assessment.overall_risk.value if hasattr(assessment.overall_risk, "value") else str(assessment.overall_risk)
    sail_verdict = "SAFE_TO_SAIL" if assessment.is_safe_to_sail else "UNSAFE_STAY_IN_PORT"

    return {
        "location": {
            "name": ref_name,
            "latitude": target_lat,
            "longitude": target_lon
        },
        "safety_score": safety_score,
        "risk_score": assessment.risk_score,
        "overall_risk": overall_risk_str,
        "sail_verdict": sail_verdict,
        "is_safe_to_sail": assessment.is_safe_to_sail,
        "advisory_headline": assessment.safety_advisory,
        "metrics": {
            "wave_height_meters": wave_h,
            "swell_height_meters": swell_h,
            "douglas_sea_state": douglas_state,
            "wind_speed_knots": wind_spd,
            "wind_gusts_knots": wind_gst,
            "beaufort_wind_force": beaufort_force
        },
        "causal_factors": assessment.reasons,
        "mandatory_precautions": assessment.recommended_precautions,
        "vessel_profile": vessel_type or "artisanal_fishing_craft"
    }

@router.post("/assess")
async def assess_sea_safety_post(req: Optional[SafetyAssessRequest] = Body(default=None)) -> Dict[str, Any]:
    """
    POST: Evaluates instant deterministic maritime safety score (0–100) via JSON payload.
    """
    p_name = req.port_name if req else "kochi"
    lat = req.latitude if req else None
    lon = req.longitude if req else None
    v_type = req.vessel_type if req else "artisanal_fishing_craft"
    return _evaluate_safety_core(port_name=p_name, lat=lat, lon=lon, vessel_type=v_type)

@router.get("/assess")
async def assess_sea_safety_get(
    port_name: Optional[str] = Query("kochi", description="Port or harbor name"),
    lat: Optional[float] = Query(None, description="Custom latitude"),
    lon: Optional[float] = Query(None, description="Custom longitude"),
    vessel_type: Optional[str] = Query("artisanal_fishing_craft", description="Type of fishing craft")
) -> Dict[str, Any]:
    """
    GET: Evaluates instant deterministic maritime safety score (0–100) via URL query parameters.
    """
    return _evaluate_safety_core(port_name=port_name, lat=lat, lon=lon, vessel_type=vessel_type)
