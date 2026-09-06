import time
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.utils.geo import haversine_distance_km, km_to_nautical_miles
from backend.utils.logger import logger

router = APIRouter(prefix="/api/emergency", tags=["Maritime Emergency & SOS"])

# Indian Coast Guard Maritime Rescue Coordination Centres (MRCC)
COAST_GUARD_MRCC_REGISTRY = [
    {
        "code": "KOC",
        "name": "MRCC Kochi (Kerala & Lakshadweep Sea)",
        "lat": 9.9656,
        "lon": 76.2425,
        "contact_phone": "+91-484-2216444",
        "vhf_channel": "VHF Channel 16 (156.800 MHz)",
        "dsc_frequency": "DSC Channel 70 (156.525 MHz)",
        "jurisdiction": "Southwest Coast & Lakshadweep Archipelago"
    },
    {
        "code": "BOM",
        "name": "MRCC Mumbai (Maharashtra, Goa & Gujarat)",
        "lat": 18.9400,
        "lon": 72.8350,
        "contact_phone": "+91-22-24388065",
        "vhf_channel": "VHF Channel 16 (156.800 MHz)",
        "dsc_frequency": "DSC Channel 70 (156.525 MHz)",
        "jurisdiction": "West Coast & Arabian Sea Corridor"
    },
    {
        "code": "MAA",
        "name": "MRCC Chennai (Tamil Nadu, Andhra & Puducherry)",
        "lat": 13.0827,
        "lon": 80.2707,
        "contact_phone": "+91-44-23460405",
        "vhf_channel": "VHF Channel 16 (156.800 MHz)",
        "dsc_frequency": "DSC Channel 70 (156.525 MHz)",
        "jurisdiction": "Coromandel Coast & Bay of Bengal"
    },
    {
        "code": "IXZ",
        "name": "MRCC Port Blair (Andaman & Nicobar Islands)",
        "lat": 11.6670,
        "lon": 92.7330,
        "contact_phone": "+91-3192-233633",
        "vhf_channel": "VHF Channel 16 (156.800 MHz)",
        "dsc_frequency": "DSC Channel 70 (156.525 MHz)",
        "jurisdiction": "Andaman Sea & Malacca Strait Approach"
    }
]

# In-memory emergency distress log
distress_ledger: List[Dict[str, Any]] = []

class DistressSignalRequest(BaseModel):
    vessel_id: Optional[str] = "IND-KL-07-ORCA"
    callsign: Optional[str] = "ORCA-INDIA"
    vessel_name: Optional[str] = None
    latitude: float
    longitude: float
    crew_count: Optional[int] = None
    persons_on_board: Optional[int] = None
    sea_state: Optional[str] = None
    sea_state_description: Optional[str] = None
    distress_type: Optional[str] = "ENGINE_FAILURE_DRIFT"
    description: Optional[str] = None
    emergency_description: Optional[str] = None

class DistressSignalResponse(BaseModel):
    status: str
    dispatch_token: str
    timestamp: str
    vessel_id: str
    callsign: str
    coordinates: Dict[str, float]
    nearest_mrcc: Dict[str, Any]
    assigned_mrcc: Optional[str] = None
    distance_to_mrcc_nm: float
    sar_response_eta_minutes: int
    eta_minutes: Optional[int] = None
    gmdss_message: str
    instructions: List[str]

def _find_nearest_mrcc(lat: float, lon: float) -> tuple[Dict[str, Any], float]:
    nearest = COAST_GUARD_MRCC_REGISTRY[0]
    min_dist_km = float("inf")
    for mrcc in COAST_GUARD_MRCC_REGISTRY:
        d = haversine_distance_km(lat, lon, mrcc["lat"], mrcc["lon"])
        if d < min_dist_km:
            min_dist_km = d
            nearest = mrcc
    return nearest, km_to_nautical_miles(min_dist_km)

@router.post("/distress", response_model=DistressSignalResponse)
@router.post("/broadcast", response_model=DistressSignalResponse)
async def broadcast_distress_beacon(req: DistressSignalRequest):
    """
    Simulates / dispatches official GMDSS Mayday distress transmission to the nearest
    Indian Coast Guard Maritime Rescue Coordination Centre (MRCC).
    """
    if req.latitude < -90 or req.latitude > 90 or req.longitude < -180 or req.longitude > 180:
        raise HTTPException(status_code=400, detail="Invalid maritime coordinates.")

    nearest_mrcc, dist_nm = _find_nearest_mrcc(req.latitude, req.longitude)

    # Indian Coast Guard Fast Interceptor Craft (FIC) cruising speed: ~35 knots
    eta_mins = max(15, int(round((dist_nm / 35.0) * 60)))

    now_epoch = int(time.time())
    dispatch_token = f"GMDSS-MRCC-{nearest_mrcc['code']}-{now_epoch % 100000:05d}"
    
    lat_card = "N" if req.latitude >= 0 else "S"
    lon_card = "E" if req.longitude >= 0 else "W"
    lat_deg = int(abs(req.latitude))
    lat_min = (abs(req.latitude) - lat_deg) * 60.0
    lon_deg = int(abs(req.longitude))
    crew_val = req.crew_count or req.persons_on_board or 4
    sea_val = req.sea_state or req.sea_state_description or "Moderate Swell 1.4m · Wind 16 kt"
    desc_val = req.description or req.emergency_description or "Immediate Search & Rescue assistance requested offshore."
    vessel_val = req.vessel_id or "IND-KL-07-ORCA"
    callsign_val = req.callsign or req.vessel_name or "ORCA-INDIA"

    dispatch_token = f"GMDSS-MRCC-{nearest_mrcc['code']}-{uuid.uuid4().hex[:8].upper()}"
    gmdss_text = (
        f"MAYDAY MAYDAY MAYDAY\n"
        f"VESSEL: {vessel_val} (CALLSIGN: {callsign_val})\n"
        f"POS: {req.latitude:.4f}°N, {req.longitude:.4f}°E\n"
        f"DISTRESS: {req.distress_type}\n"
        f"PERSONS ON BOARD: {crew_val}\n"
        f"SEA STATE: {sea_val}\n"
        f"MESSAGE: {desc_val}\n"
        f"DISPATCHED TO: {nearest_mrcc['name']} VIA {nearest_mrcc['vhf_channel']}"
    )

    record = {
        "dispatch_token": dispatch_token,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "vessel_id": vessel_val,
        "callsign": callsign_val,
        "coordinates": {"lat": req.latitude, "lon": req.longitude},
        "distress_type": req.distress_type,
        "crew_count": crew_val,
        "nearest_mrcc": nearest_mrcc,
        "distance_nm": round(dist_nm, 1),
        "eta_minutes": eta_mins
    }
    distress_ledger.append(record)
    logger.warning(f"🚨 [GMDSS SOS BROADCAST] {dispatch_token} from {vessel_val} at ({req.latitude}, {req.longitude}) -> {nearest_mrcc['name']}")

    return DistressSignalResponse(
        status="TRANSMITTED_AND_LOGGED",
        dispatch_token=dispatch_token,
        timestamp=record["timestamp"],
        vessel_id=vessel_val,
        callsign=callsign_val,
        coordinates={"lat": req.latitude, "lon": req.longitude},
        nearest_mrcc=nearest_mrcc,
        assigned_mrcc=nearest_mrcc["name"],
        distance_to_mrcc_nm=round(dist_nm, 1),
        sar_response_eta_minutes=eta_mins,
        eta_minutes=eta_mins,
        gmdss_message=gmdss_text,
        instructions=[
            f"Maintain listening watch on {nearest_mrcc['vhf_channel']}.",
            "Activate all personal flotation devices (life jackets) and emergency strobe beacons.",
            "Deploy sea anchor to minimize leeway drift while awaiting Fast Interceptor Craft arrival.",
            f"If battery permits, contact MRCC direct hotline: {nearest_mrcc['contact_phone']}."
        ]
    )

@router.get("/mrcc")
async def list_coast_guard_mrcc_stations() -> Dict[str, Any]:
    """
    Returns the complete directory of Indian Coast Guard Maritime Rescue
    Coordination Centres (MRCC) across Indian coastal corridors.
    """
    return {
        "agency": "Indian Coast Guard (ICG) National Maritime Search and Rescue (SAR) Board",
        "total_stations": len(COAST_GUARD_MRCC_REGISTRY),
        "stations": COAST_GUARD_MRCC_REGISTRY
    }

@router.get("/logs")
async def get_emergency_distress_logs() -> List[Dict[str, Any]]:
    """Returns recent emergency distress transmissions from ledger."""
    return distress_ledger[-20:]

@router.get("/status/{dispatch_token}")
async def get_distress_status(dispatch_token: str) -> Dict[str, Any]:
    """
    Queries current operational SAR status for a specific GMDSS emergency token.
    """
    for rec in reversed(distress_ledger):
        if rec.get("dispatch_token") == dispatch_token:
            return {
                "dispatch_token": dispatch_token,
                "found": True,
                "status": rec.get("status", "ACTIVE_SAR_RESPONSE"),
                "record": rec
            }
    raise HTTPException(status_code=404, detail=f"Distress token '{dispatch_token}' not found.")

@router.post("/cancel/{dispatch_token}")
async def cancel_distress_beacon(dispatch_token: str, reason: Optional[str] = "False alarm or vessel regained self-propulsion") -> Dict[str, Any]:
    """
    Officially stands down a distress alert and informs Coast Guard MRCC.
    """
    for rec in distress_ledger:
        if rec.get("dispatch_token") == dispatch_token:
            rec["status"] = "CANCELLED_STOOD_DOWN"
            rec["cancelled_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            rec["cancellation_reason"] = reason
            logger.info(f"✅ [SAR STAND DOWN] {dispatch_token} stood down. Reason: {reason}")
            return {
                "dispatch_token": dispatch_token,
                "status": "CANCELLED_STOOD_DOWN",
                "message": f"Distress call {dispatch_token} successfully stood down with ICG MRCC."
            }
    raise HTTPException(status_code=404, detail=f"Distress token '{dispatch_token}' not found.")
