from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from backend.database.models import FreshnessStatus

class FreshnessService:
    """
    Computes data freshness status, latency in hours, and confidence ratings.
    """
    @staticmethod
    def calculate_data_age(observed_at_iso: str) -> float:
        try:
            # Handle ISO format with Z or timezone offset
            obs_dt = datetime.fromisoformat(observed_at_iso.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            delta = now - obs_dt
            age_hours = max(0.0, delta.total_seconds() / 3600.0)
            return round(age_hours, 2)
        except Exception:
            return 1.0 # Default fallback age

    @classmethod
    def evaluate_freshness(cls, observed_at_iso: str) -> Tuple[FreshnessStatus, float, str]:
        age_hours = cls.calculate_data_age(observed_at_iso)
        if age_hours < 3.0:
            return FreshnessStatus.LIVE, age_hours, "Live telemetry (< 3h latency)"
        elif age_hours < 12.0:
            return FreshnessStatus.NEAR_REAL_TIME, age_hours, "Near real-time observation (3-12h latency)"
        elif age_hours < 48.0:
            return FreshnessStatus.DELAYED, age_hours, "Delayed feed (12-48h latency)"
        else:
            return FreshnessStatus.HISTORICAL, age_hours, "Historical observation (> 48h latency)"

freshness_service = FreshnessService()
