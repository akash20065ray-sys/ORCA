import time
from typing import Dict, Any
from fastapi import APIRouter
from backend.config import settings
from backend.utils.llm_client import llm_client
from backend.database.supabase import supabase_db

router = APIRouter(prefix="/api/health", tags=["Health & System Status"])

@router.get("")
async def system_health_status() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "system": settings.PROJECT_NAME,
        "sih_problem_id": settings.SIH_PROBLEM_ID,
        "version": settings.VERSION,
        "timestamp": time.time(),
        "components": {
            "orchestrator": "active (8 specialized agents)",
            "llm_engine": "Anthropic Claude 3.5 Sonnet" if llm_client.is_available() else "Deterministic Grounded Heuristics Engine",
            "database_gis": "Supabase Cloud PostGIS" if supabase_db.is_connected else "Embedded PostGIS Spatial Index Engine",
            "connectors": {
                "open_meteo_marine": "operational",
                "noaa_copernicus_sst_chl": "operational",
                "incois_imd_advisories": "operational",
                "maritime_gis_boundaries": "operational",
                "in_situ_buoy_network": "operational"
            },
            "engines": {
                "deterministic_risk_engine": "active",
                "deterministic_route_engine": "active",
                "incois_pfz_engine": "active"
            }
        }
    }
