import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from backend.database.models import MarineObservation, FreshnessStatus, QualityFlag

class DataNormalizationService:
    """
    Standardizes disparate units, coordinate representations, and timestamps into the canonical ORCA schema.
    """
    @staticmethod
    def kmh_to_knots(kmh: float) -> float:
        return round(kmh * 0.539957, 2)

    @staticmethod
    def ms_to_knots(ms: float) -> float:
        return round(ms * 1.94384, 2)

    @staticmethod
    def knots_to_beaufort(knots: float) -> int:
        if knots < 1: return 0
        elif knots <= 3: return 1
        elif knots <= 6: return 2
        elif knots <= 10: return 3
        elif knots <= 16: return 4
        elif knots <= 21: return 5
        elif knots <= 27: return 6
        elif knots <= 33: return 7
        elif knots <= 40: return 8
        elif knots <= 47: return 9
        elif knots <= 55: return 10
        elif knots <= 63: return 11
        else: return 12

    @staticmethod
    def wave_height_to_douglas_sea_state(height_m: float) -> Tuple[int, str]:
        if height_m < 0.1: return (0, "Calm (glassy)")
        elif height_m <= 0.5: return (1, "Calm (rippled)")
        elif height_m <= 1.25: return (2, "Smooth")
        elif height_m <= 2.5: return (3, "Slight to Moderate")
        elif height_m <= 4.0: return (4, "Rough")
        elif height_m <= 6.0: return (5, "Very Rough")
        elif height_m <= 9.0: return (6, "High")
        elif height_m <= 14.0: return (7, "Very High")
        else: return (8, "Phenomenal")

    @classmethod
    def create_observation(
        cls,
        source: str,
        dataset: str,
        variable: str,
        latitude: float,
        longitude: float,
        value: float,
        unit: str,
        timestamp: str,
        quality_flag: QualityFlag = QualityFlag.VALIDATED,
        data_age_hours: float = 0.5,
        metadata: Optional[Dict[str, Any]] = None
    ) -> MarineObservation:
        # Determine freshness status
        if data_age_hours < 3.0:
            freshness = FreshnessStatus.LIVE
        elif data_age_hours < 12.0:
            freshness = FreshnessStatus.NEAR_REAL_TIME
        elif data_age_hours < 48.0:
            freshness = FreshnessStatus.DELAYED
        else:
            freshness = FreshnessStatus.HISTORICAL

        return MarineObservation(
            id=str(uuid.uuid4()),
            source=source,
            dataset=dataset,
            variable=variable,
            latitude=round(latitude, 4),
            longitude=round(longitude, 4),
            value=round(value, 3),
            unit=unit,
            timestamp=timestamp,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            data_age_hours=round(data_age_hours, 2),
            freshness_status=freshness,
            quality_flag=quality_flag,
            metadata=metadata or {}
        )

normalization_service = DataNormalizationService()
