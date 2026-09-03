import time
from typing import Dict, Any, List, Optional
from backend.utils.logger import logger
from backend.utils.llm_client import llm_client
from backend.utils.geo import resolve_location_name, COASTAL_PORT_REGISTRY
from backend.config import settings

class PlanningAgent:
    """
    Agent 1: Planning Agent
    The Planning Agent uses an LLM to understand the user's request, decompose the task and coordinate the required specialized agents.
    The LLM never fabricates marine measurements, coordinates, or hazard values.
    """
    def __init__(self):
        self.name = "planning_agent"
        self.title = "Planning & Task Decomposition Agent"

    def plan(self, user_query: str, user_location: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        start_time = time.time()
        logger.info(f"[{self.title}] Analyzing query: '{user_query}'")

        system_prompt = (
            "You are the Planning Agent in ORCA (Marine EcOsystem Reasoning with Collaborative Agents).\n"
            "Your role is to understand the natural language query, extract intent, location, timeframe, "
            "and select the necessary specialized agents from this exact list:\n"
            "- marine_data_retrieval_agent\n"
            "- ocean_analytics_agent\n"
            "- weather_intelligence_agent\n"
            "- alert_notification_agent\n"
            "- risk_assessment_agent\n"
            "- geospatial_analysis_agent\n"
            "- response_synthesis_agent\n\n"
            "Return a JSON object with: intent, target_location, coordinates {latitude, longitude}, "
            "timeframe, selected_agents, requires_routing (bool), route_endpoints (optional), "
            "requires_pfz (bool), requires_risk_assessment (bool), reasoning_summary."
        )

        user_prompt = f"Query: {user_query}\nUser Coordinates Override: {user_location or 'None'}"
        
        parsed_plan = llm_client.generate_json(system_prompt, user_prompt)

        # Coordinate reconciliation with coastal database
        target_name = parsed_plan.get("target_location", "Chennai Port")
        resolved = resolve_location_name(user_query)
        
        lat = settings.DEFAULT_LAT
        lon = settings.DEFAULT_LON
        
        if user_location and "lat" in user_location and "lon" in user_location:
            lat = user_location["lat"]
            lon = user_location["lon"]
            target_name = "User GPS Location"
        elif resolved:
            lat = resolved["lat"]
            lon = resolved["lon"]
            target_name = resolved["name"]
        elif "coordinates" in parsed_plan and isinstance(parsed_plan["coordinates"], dict):
            coords = parsed_plan["coordinates"]
            lat = coords.get("latitude", settings.DEFAULT_LAT)
            lon = coords.get("longitude", settings.DEFAULT_LON)

        parsed_plan["coordinates"] = {"latitude": lat, "longitude": lon}
        parsed_plan["target_location"] = target_name

        # Ensure response synthesis agent is always included at the end
        if "response_synthesis_agent" not in parsed_plan.get("selected_agents", []):
            parsed_plan["selected_agents"].append("response_synthesis_agent")

        duration_ms = round((time.time() - start_time) * 1000, 2)
        parsed_plan["planning_duration_ms"] = duration_ms

        return parsed_plan

planning_agent = PlanningAgent()
