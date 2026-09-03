import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    # App Settings
    PROJECT_NAME: str = "ORCA — Agentic AI for Ocean Intelligence"
    SIH_PROBLEM_ID: str = "SIH26176"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")
    
    # LLM Settings
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    DEFAULT_CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"
    
    # Supabase / PostGIS
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Data Connectors & Caching
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", 1800))
    OPEN_METEO_BASE_URL: str = "https://marine-api.open-meteo.com/v1/marine"
    OPEN_METEO_WEATHER_URL: str = "https://api.open-meteo.com/v1/forecast"
    
    # Coordinates of Reference Region (Default: Indian Ocean / Bay of Bengal / Arabian Sea)
    DEFAULT_LAT: float = 13.0827
    DEFAULT_LON: float = 80.2707 # Chennai Port
    DEFAULT_SEARCH_RADIUS_KM: float = 150.0

settings = Settings()
