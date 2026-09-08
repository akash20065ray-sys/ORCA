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
    HOST: str = os.getenv("HOST", "0.0.0.0" if (os.getenv("RENDER") or os.getenv("ENVIRONMENT") == "production") else "127.0.0.1")
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")
    
    # LLM Settings (Multi-Provider: Claude, Sarvam AI, OpenAI, Gemini, Groq)
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    DEFAULT_CLAUDE_MODEL: str = os.getenv("DEFAULT_CLAUDE_MODEL", "claude-3-5-sonnet-20241022")
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")
    DEFAULT_SARVAM_MODEL: str = os.getenv("DEFAULT_SARVAM_MODEL", "sarvam-105b-conversations")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    DEFAULT_OPENAI_MODEL: str = os.getenv("DEFAULT_OPENAI_MODEL", "gpt-4o-mini")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    DEFAULT_GROQ_MODEL: str = os.getenv("DEFAULT_GROQ_MODEL", "llama-3.3-70b-versatile")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEFAULT_GEMINI_MODEL: str = os.getenv("DEFAULT_GEMINI_MODEL", "gemini-3.6-flash")
    LLM_TIMEOUT_SECONDS: float = float(os.getenv("LLM_TIMEOUT_SECONDS", 8.0))
    
    # Supabase / PostGIS
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Data Connectors & Caching
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", 1800))
    OPEN_METEO_BASE_URL: str = "https://marine-api.open-meteo.com/v1/marine"
    OPEN_METEO_WEATHER_URL: str = "https://api.open-meteo.com/v1/forecast"
    
    # Coordinates of Reference Region (Default: Indian Ocean / Bay of Bengal / Arabian Sea)
    DEFAULT_LAT: float = 9.9656
    DEFAULT_LON: float = 76.2425 # Cochin Port (Kochi baseline)
    DEFAULT_SEARCH_RADIUS_KM: float = 150.0

settings = Settings()
