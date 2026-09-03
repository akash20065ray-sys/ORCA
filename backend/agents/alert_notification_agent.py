import time
from typing import Dict, Any, List
from backend.utils.logger import logger
from backend.data_connectors.advisories import marine_advisories_connector
from backend.database.models import HazardAdvisory

class AlertNotificationAgent:
    """
    Agent 5: Alert & Notification Agent
    Aggregates government marine bulletins, rough sea warnings, port signal flags, and cyclone advisories.
    """
    def __init__(self):
        self.name = "alert_notification_agent"
        self.title = "Alert & Notification Agent"

    def execute(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        loc_name = plan.get("target_location", "")
        coords = plan.get("coordinates", {})
        lat = coords.get("latitude")
        lon = coords.get("longitude")

        logger.info(f"[{self.title}] Scanning for active marine hazard advisories for {loc_name}")

        hazards = marine_advisories_connector.fetch_data(region_name=loc_name, location_lat=lat, location_lon=lon)

        # Categorize severity
        critical_warnings = [h for h in hazards if h.severity == "WARNING"]
        watches = [h for h in hazards if h.severity == "WATCH"]
        advisories = [h for h in hazards if h.severity == "ADVISORY"]

        has_active_hazards = len(hazards) > 0
        summary = (
            f"Found {len(hazards)} active advisories ({len(critical_warnings)} warnings, {len(watches)} watches)."
            if has_active_hazards
            else "No active marine hazard warnings detected for this sector."
        )

        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "agent": self.name,
            "status": "completed",
            "duration_ms": duration_ms,
            "summary": summary,
            "has_active_hazards": has_active_hazards,
            "total_hazards": len(hazards),
            "critical_warnings_count": len(critical_warnings),
            "hazards": [h.model_dump() for h in hazards]
        }

alert_notification_agent = AlertNotificationAgent()
