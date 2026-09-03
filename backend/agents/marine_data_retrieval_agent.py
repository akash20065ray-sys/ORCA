import time
from typing import Dict, Any, List
from backend.utils.logger import logger
from backend.data_connectors.open_meteo import open_meteo_connector
from backend.data_connectors.ocean_sst_chl import ocean_sst_chl_connector
from backend.data_connectors.in_situ import in_situ_connector
from backend.database.supabase import supabase_db
from backend.services.data_normalization import normalization_service
from backend.database.models import FreshnessStatus, QualityFlag

class MarineDataRetrievalAgent:
    """
    Agent 2: Marine Data Retrieval Agent
    Obtains relevant marine/ocean observations and coordinates dataset retrieval through connectors.
    """
    def __init__(self):
        self.name = "marine_data_retrieval_agent"
        self.title = "Marine Data Retrieval Agent"

    def execute(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        coords = plan.get("coordinates", {})
        lat = coords.get("latitude", 13.0827)
        lon = coords.get("longitude", 80.2707)

        logger.info(f"[{self.title}] Ingesting marine datasets for Lat: {lat}, Lon: {lon}")

        # 1. Fetch Marine & Atmospheric data
        marine_weather = open_meteo_connector.fetch_data(lat, lon)
        
        # 2. Fetch Ocean SST & Chlorophyll-a satellite data
        ocean_data = ocean_sst_chl_connector.fetch_data(lat, lon)

        # 3. Fetch In-situ buoy data if available
        buoy_data = in_situ_connector.fetch_data(lat, lon)

        # Normalize and store observations in Supabase / Local storage
        curr_m = marine_weather.get("current", {})
        obs_wave = normalization_service.create_observation(
            source=marine_weather["source"],
            dataset=marine_weather["dataset"],
            variable="wave_height",
            latitude=lat,
            longitude=lon,
            value=curr_m.get("wave_height_m", 1.2),
            unit="meters",
            timestamp=marine_weather["timestamp"],
            data_age_hours=marine_weather["data_age_hours"]
        )
        supabase_db.save_observation(obs_wave)

        obs_sst = normalization_service.create_observation(
            source=ocean_data["source"],
            dataset=ocean_data["dataset"],
            variable="sst",
            latitude=lat,
            longitude=lon,
            value=ocean_data["sst_celsius"],
            unit="°C",
            timestamp=ocean_data["timestamp"],
            data_age_hours=ocean_data["data_age_hours"]
        )
        supabase_db.save_observation(obs_sst)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "agent": self.name,
            "status": "completed",
            "duration_ms": duration_ms,
            "summary": f"Retrieved physical telemetry from {marine_weather['source']} & {ocean_data['source']}.",
            "marine_weather": marine_weather,
            "ocean_data": ocean_data,
            "buoy_data": buoy_data,
            "observations_count": 2 + (1 if buoy_data else 0)
        }

marine_data_retrieval_agent = MarineDataRetrievalAgent()
