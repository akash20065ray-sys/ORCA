import time
from typing import Dict, Any, List
from backend.utils.logger import logger
from backend.services.risk_engine import risk_engine
from backend.database.models import HazardAdvisory, FreshnessStatus, RiskAssessment

class RiskAssessmentAgent:
    """
    Agent 6: Risk Assessment Agent
    Executes multi-factor deterministic risk calculation across wave states, wind forces,
    lightning danger, cyclone tracks, and IMBL geofencing restrictions.
    """
    def __init__(self):
        self.name = "risk_assessment_agent"
        self.title = "Risk Assessment Agent"

    def execute(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        logger.info(f"[{self.title}] Performing deterministic multi-parameter safety assessment")

        weather_res = context.get("weather_intelligence_agent", {})
        alert_res = context.get("alert_notification_agent", {})
        geo_res = context.get("geospatial_analysis_agent", {})
        retrieval_res = context.get("marine_data_retrieval_agent", {})
        marine_weather = retrieval_res.get("marine_weather", {})

        wave_h = weather_res.get("wave_height_meters", 1.3)
        swell_m = weather_res.get("swell_wave_meters", 1.0)
        wind_kts = weather_res.get("wind_speed_knots", 15.0)
        gusts_kts = weather_res.get("wind_gusts_knots", 20.0)

        # Parse hazards
        raw_hazards = alert_res.get("hazards", [])
        active_hazards = [HazardAdvisory(**h) for h in raw_hazards]

        is_restricted = geo_res.get("is_inside_restricted_zone", False)
        geofence_alerts = geo_res.get("geofence_alerts", [])
        freshness = marine_weather.get("freshness", FreshnessStatus.LIVE)

        risk_result: RiskAssessment = risk_engine.evaluate_risk(
            wave_height_m=wave_h,
            swell_wave_m=swell_m,
            wind_speed_kts=wind_kts,
            wind_gusts_kts=gusts_kts,
            active_hazards=active_hazards,
            is_restricted_zone=is_restricted,
            geofence_alerts=geofence_alerts,
            data_freshness=freshness
        )

        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "agent": self.name,
            "status": "completed",
            "duration_ms": duration_ms,
            "summary": f"Calculated Risk Level: {risk_result.overall_risk.value} (Score: {risk_result.risk_score}/100). Safe to sail: {risk_result.is_safe_to_sail}.",
            "risk_assessment": risk_result.model_dump()
        }

risk_assessment_agent = RiskAssessmentAgent()
