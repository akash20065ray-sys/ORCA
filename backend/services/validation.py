from typing import Tuple, Optional
from backend.database.models import QualityFlag

class DataValidationService:
    """
    Validates physical parameters, coordinate ranges, and flags anomalous or suspect measurements.
    """
    @staticmethod
    def validate_coordinates(lat: float, lon: float) -> Tuple[bool, str]:
        if not (-90.0 <= lat <= 90.0):
            return False, f"Invalid latitude {lat}. Must be between -90.0 and 90.0."
        if not (-180.0 <= lon <= 180.0):
            return False, f"Invalid longitude {lon}. Must be between -180.0 and 180.0."
        return True, "Valid coordinates"

    @staticmethod
    def validate_sst(sst: float) -> Tuple[bool, QualityFlag]:
        if -2.0 <= sst <= 38.0:
            return True, QualityFlag.VALIDATED
        return False, QualityFlag.SUSPECT

    @staticmethod
    def validate_chlorophyll(chl: float) -> Tuple[bool, QualityFlag]:
        if 0.01 <= chl <= 65.0:
            return True, QualityFlag.VALIDATED
        return False, QualityFlag.SUSPECT

    @staticmethod
    def validate_wind(wind_kts: float) -> Tuple[bool, QualityFlag]:
        if 0.0 <= wind_kts <= 140.0:
            return True, QualityFlag.VALIDATED
        return False, QualityFlag.SUSPECT

    @staticmethod
    def validate_wave_height(height_m: float) -> Tuple[bool, QualityFlag]:
        if 0.0 <= height_m <= 22.0:
            return True, QualityFlag.VALIDATED
        return False, QualityFlag.SUSPECT

validation_service = DataValidationService()
