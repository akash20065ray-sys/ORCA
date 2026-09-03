import time
from typing import Dict, Any, List
from backend.utils.logger import logger
from backend.services.pfz_engine import pfz_engine

class OceanAnalyticsAgent:
    """
    Agent 3: Ocean Analytics Agent
    Analyzes physical and biological ocean variables from ISRO Oceansat-3 and NOAA GHRSST:
    - Sea Surface Temperature (SST) in °C
    - Chlorophyll-a concentration in mg/m³
    - Thermal Frontal Gradients (ΔT/km)
    - Coastal Upwelling & Primary Biological Productivity
    - Fish productivity decline diagnostics
    """
    def __init__(self):
        self.name = "ocean_analytics_agent"
        self.title = "Ocean Analytics Agent"

    def execute(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        coords = plan.get("coordinates", {})
        lat = coords.get("latitude", 13.0827)
        lon = coords.get("longitude", 80.2707)
        loc_name = plan.get("target_location", "Coastal Station")
        intent = plan.get("intent", "general_marine_query")

        logger.info(f"[{self.title}] Performing satellite oceanographic analysis for {loc_name}")

        retrieval_res = context.get("marine_data_retrieval_agent", {})
        ocean_data = retrieval_res.get("ocean_data", {})
        
        sst = ocean_data.get("sst_celsius", 28.5)
        chl = ocean_data.get("chlorophyll_mg_m3", 0.45)
        gradient = ocean_data.get("sst_gradient_deg_km", 0.52)
        productivity_state = ocean_data.get("productivity_state", "Stable Mesotrophic Waters")

        # Generate PFZ advisories if relevant
        pfz_list = []
        if plan.get("requires_pfz", False) or intent in ("potential_fishing_zone", "ocean_condition_telemetry", "chlorophyll_sst_correlation"):
            pfz_list = pfz_engine.generate_pfz_advisories(lat, lon, loc_name)

        # Productivity decline diagnostic
        decline_diagnosis = None
        if "decline" in intent or "productivity_decline" in intent:
            decline_diagnosis = pfz_engine.analyze_productivity_decline(loc_name, lat, lon)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "agent": self.name,
            "status": "completed",
            "duration_ms": duration_ms,
            "summary": f"Analyzed ISRO/NOAA SST ({sst}°C), Chl-a ({chl} mg/m³), and thermal gradient ({gradient}°C/km). {productivity_state}.",
            "sst_celsius": sst,
            "chlorophyll_mg_m3": chl,
            "sst_gradient_deg_km": gradient,
            "productivity_state": productivity_state,
            "upwelling_active": ocean_data.get("upwelling_active", False),
            "pfz_advisories": [p.model_dump() for p in pfz_list],
            "decline_diagnosis": decline_diagnosis,
            "has_active_pfz": len(pfz_list) > 0
        }

ocean_analytics_agent = OceanAnalyticsAgent()
