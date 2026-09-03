import time
from typing import Dict, Any
from backend.utils.logger import logger
from backend.services.data_normalization import normalization_service

class WeatherIntelligenceAgent:
    """
    Agent 4: Weather Intelligence Agent
    Evaluates wind vectors, gusts, marine pressure, wave heights, swell period, and forecast sequences.
    """
    def __init__(self):
        self.name = "weather_intelligence_agent"
        self.title = "Weather Intelligence Agent"

    def execute(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        logger.info(f"[{self.title}] Evaluating meteorological and wave conditions")

        retrieval_res = context.get("marine_data_retrieval_agent", {})
        marine_weather = retrieval_res.get("marine_weather", {})
        curr = marine_weather.get("current", {})

        wind_kts = curr.get("wind_speed_kts", 15.0)
        wind_gusts_kts = curr.get("wind_gusts_kts", 20.0)
        wave_height_m = curr.get("wave_height_m", 1.3)
        swell_m = curr.get("swell_wave_height_m", 1.0)
        wave_period_s = curr.get("wave_period_s", 7.0)
        pressure_hpa = curr.get("surface_pressure_hpa", 1012.0)
        weather_cond = curr.get("weather_condition", "Fair")

        beaufort_scale = normalization_service.knots_to_beaufort(wind_kts)
        douglas_code, douglas_desc = normalization_service.wave_height_to_douglas_sea_state(wave_height_m)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "agent": self.name,
            "status": "completed",
            "duration_ms": duration_ms,
            "summary": f"Wind {wind_kts} kts (Beaufort {beaufort_scale}), Wave {wave_height_m}m ({douglas_desc}), Pressure {pressure_hpa} hPa.",
            "wind_speed_knots": wind_kts,
            "wind_gusts_knots": wind_gusts_kts,
            "beaufort_scale": beaufort_scale,
            "wave_height_meters": wave_height_m,
            "swell_wave_meters": swell_m,
            "wave_period_seconds": wave_period_s,
            "douglas_sea_state": {"code": douglas_code, "description": douglas_desc},
            "surface_pressure_hpa": pressure_hpa,
            "weather_condition": weather_cond,
            "forecast_timeline": marine_weather.get("timeline", [])
        }

weather_intelligence_agent = WeatherIntelligenceAgent()
