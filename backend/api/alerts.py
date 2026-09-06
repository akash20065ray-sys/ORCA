from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query
from backend.data_connectors.advisories import marine_advisories_connector, ADVISORY_REGIONS
from backend.database.models import HazardAdvisory
from backend.utils.logger import logger

router = APIRouter(prefix="/api/alerts", tags=["Maritime Advisories & Port Signals"])

# Official IMD Port Danger Warning Signals (1 to 11) definition registry
IMD_PORT_SIGNALS_REGISTRY = [
    {
        "signal": 1,
        "name": "Cautionary Signal No. 1",
        "day_shape": "One Black Ball",
        "night_light": "One White Light over One Red Light",
        "meaning": "Distant system. Squally weather may set in. Port is not in direct imminent danger, but deep-sea crafts should exercise caution."
    },
    {
        "signal": 2,
        "name": "Warning Signal No. 2",
        "day_shape": "One Black Cone pointing upwards",
        "night_light": "One Red Light over One White Light",
        "meaning": "Disturbance has intensified into depression/cyclone. Vessels leaving port should exercise extreme caution."
    },
    {
        "signal": 3,
        "name": "Local Cautionary Signal No. 3",
        "day_shape": "One Black Ball over One Black Cone pointing upwards",
        "night_light": "Two White Lights vertically",
        "meaning": "Port itself is threatened by squally weather or gale-force gusts (wind speed 22-27 kts). Small crafts must remain in harbour."
    },
    {
        "signal": 4,
        "name": "Local Warning Signal No. 4",
        "day_shape": "One Black Cylinder",
        "night_light": "One Red Light over Two White Lights",
        "meaning": "Port threatened by cyclonic storm. Wind speed 28-33 kts. Total prohibition on artisanal boats leaving harbour."
    },
    {
        "signal": 5,
        "name": "Danger Signal No. 5",
        "day_shape": "One Black Cone pointing downwards",
        "night_light": "Two Red Lights vertically",
        "meaning": "Storm of slight/moderate intensity expected to cross coast keeping port to the south. Wind speed 34-47 kts."
    },
    {
        "signal": 6,
        "name": "Danger Signal No. 6",
        "day_shape": "One Black Cone pointing upwards",
        "night_light": "One White Light between Two Red Lights",
        "meaning": "Storm expected to cross coast keeping port to the north. Wind speed 34-47 kts. Serious danger to vessels."
    },
    {
        "signal": 7,
        "name": "Danger Signal No. 7",
        "day_shape": "Two Black Cones points together (Hourglass)",
        "night_light": "Two White Lights between Two Red Lights",
        "meaning": "Storm expected to cross directly over or very close to the port. Severe gale winds."
    },
    {
        "signal": 8,
        "name": "Great Danger Signal No. 8",
        "day_shape": "Two Black Cones base to base (Diamond)",
        "night_light": "Two Red Lights over One White Light",
        "meaning": "Very severe cyclonic storm expected to cross coast keeping port to the south. Hurricane winds (48-63 kts)."
    },
    {
        "signal": 9,
        "name": "Great Danger Signal No. 9",
        "day_shape": "One Black Cone pointing upwards over Black Ball",
        "night_light": "One White Light over Two Red Lights",
        "meaning": "Very severe cyclonic storm expected to cross coast keeping port to the north. Hurricane winds (48-63 kts)."
    },
    {
        "signal": 10,
        "name": "Great Danger Signal No. 10",
        "day_shape": "Two Black Cones points upwards",
        "night_light": "Three Red Lights vertically",
        "meaning": "Super cyclonic storm expected to cross directly over port. Catastrophic winds (> 64 kts). Complete harbour evacuation."
    },
    {
        "signal": 11,
        "name": "Failure of Communication Signal No. 11",
        "day_shape": "Two Black Balls vertically",
        "night_light": "One Red Light over One White Light over One Red Light",
        "meaning": "Communications with meteorological warning centre have failed. Local officer considers there is danger of bad weather."
    }
]

@router.get("/active")
async def get_active_marine_alerts(
    region: Optional[str] = Query(None, description="Filter by coastal region"),
    severity: Optional[str] = Query(None, description="Filter by severity: CRITICAL, WARNING, ADVISORY"),
    advisory_type: Optional[str] = Query(None, description="Filter by type: HIGH_WAVE, CYCLONE, SQUALL, LIGHTNING"),
    limit: Optional[int] = Query(20, description="Maximum number of alerts to return")
) -> Dict[str, Any]:
    """
    Returns active official ocean weather alerts from INCOIS and IMD:
    - High Wave & Swell Surge Bulletins (Kallakkadal)
    - IMD Squall & Convective Storm Advisories
    - Current Hoisted Port Danger Signals
    """
    all_hazards = marine_advisories_connector.fetch_data()
    
    filtered = []
    for h in all_hazards:
        h_dict = h.model_dump()
        
        # Region filter
        if region and region.lower() not in h.region.lower() and not any(region.lower() in z.lower() for z in h.affected_zones):
            continue
            
        # Severity filter
        h_sev = h.severity.value if hasattr(h.severity, "value") else str(h.severity)
        if severity and severity.upper() != h_sev.upper():
            continue
            
        # Type filter
        if advisory_type and advisory_type.upper() != h.advisory_type:
            continue
            
        filtered.append(h_dict)

    return {
        "total_active_alerts": len(filtered),
        "alerts": filtered[:limit],
        "monitoring_regions": [r["region"] for r in ADVISORY_REGIONS],
        "issuing_authorities": [
            "Indian National Centre for Ocean Information Services (INCOIS)",
            "India Meteorological Department (IMD Cyclone Warning Division)",
            "Indian Coast Guard (ICG Maritime Safety Broadcast)"
        ]
    }

@router.get("/signals")
async def get_port_warning_signals() -> Dict[str, Any]:
    """
    Returns the complete 11-stage IMD Port Warning Signal catalog
    with daytime flag shapes, nighttime beacon lamps, and skipper instructions.
    """
    return {
        "system": "India Meteorological Department (IMD) Standard Maritime Port Warning Signal Code",
        "total_signals": len(IMD_PORT_SIGNALS_REGISTRY),
        "signals": IMD_PORT_SIGNALS_REGISTRY,
        "active_ports_sample": [
            {"port": "Cochin Port (Kochi)", "hoisted_signal": 1, "status": "Cautionary: Distant swell monitored"},
            {"port": "Mumbai Harbour", "hoisted_signal": 1, "status": "Normal Maritime Operations"},
            {"port": "Chennai Port", "hoisted_signal": 2, "status": "Warning: Fresh breeze & wave surge"},
            {"port": "Visakhapatnam Port", "hoisted_signal": 1, "status": "Normal Operations"}
        ]
    }
