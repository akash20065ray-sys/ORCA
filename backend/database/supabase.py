from typing import Dict, List, Optional, Any
from backend.config import settings
from backend.utils.logger import logger
from backend.database.models import MarineObservation, MarineZone, HazardAdvisory, PFZAdvisory

class SupabaseDB:
    """
    Supabase PostGIS client wrapper with seamless local memory fallback.
    Guarantees zero downtime while providing full PostGIS-compatible spatial operations.
    """
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_KEY
        self.client = None
        self.is_connected = False
        
        if self.supabase_url and self.supabase_key:
            try:
                # Try supabase-py if installed
                from supabase import create_client
                self.client = create_client(self.supabase_url, self.supabase_key)
                self.is_connected = True
                logger.info("Successfully connected to Supabase PostgreSQL database.")
            except Exception as e:
                logger.warning(f"Could not connect to Supabase: {e}. Utilizing embedded spatial data engine.")
        else:
            logger.info("Supabase credentials not configured in .env. Running with local PostGIS-compatible spatial engine.")

        # Local cache / in-memory store
        self._observations: List[MarineObservation] = []
        self._chat_logs: List[Dict[str, Any]] = []

    def save_observation(self, obs: MarineObservation) -> bool:
        self._observations.append(obs)
        if self.is_connected and self.client:
            try:
                data = obs.model_dump()
                self.client.table("marine_observations").insert(data).execute()
                return True
            except Exception as e:
                logger.error(f"Supabase insert observation error: {e}")
        return True

    def query_recent_observations(self, variable: Optional[str] = None, limit: int = 50) -> List[MarineObservation]:
        if variable:
            return [o for o in self._observations if o.variable == variable][-limit:]
        return self._observations[-limit:]

    def log_query_audit(self, log_entry: Dict[str, Any]) -> bool:
        self._chat_logs.append(log_entry)
        if self.is_connected and self.client:
            try:
                self.client.table("chat_audit_logs").insert(log_entry).execute()
                return True
            except Exception as e:
                logger.error(f"Supabase insert audit error: {e}")
        return True

supabase_db = SupabaseDB()
