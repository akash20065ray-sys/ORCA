import pytest
from backend.services.risk_engine import risk_engine
from backend.database.models import RiskLevel, FreshnessStatus, HazardAdvisory

def test_calm_conditions_risk_evaluation():
    risk = risk_engine.evaluate_risk(
        wave_height_m=0.8,
        swell_wave_m=0.6,
        wind_speed_kts=8.0,
        wind_gusts_kts=11.0,
        active_hazards=[],
        is_restricted_zone=False,
        data_freshness=FreshnessStatus.LIVE
    )
    assert risk.overall_risk == RiskLevel.LOW
    assert risk.is_safe_to_sail is True
    assert risk.risk_score < 25

def test_rough_sea_and_cyclonic_risk_evaluation():
    active_warning = HazardAdvisory(
        id="ADV-TEST-01",
        title="Severe Cyclone Warning",
        advisory_type="CYCLONE",
        severity="WARNING",
        issuing_authority="IMD",
        region="Bay of Bengal",
        valid_from="2026-09-01T00:00:00Z",
        valid_to="2026-09-02T00:00:00Z",
        description="Dangerous cyclonic storm with wind speed > 45 kts.",
        port_warning_signal=8
    )
    risk = risk_engine.evaluate_risk(
        wave_height_m=3.8,
        swell_wave_m=3.2,
        wind_speed_kts=38.0,
        wind_gusts_kts=48.0,
        active_hazards=[active_warning],
        is_restricted_zone=False,
        data_freshness=FreshnessStatus.LIVE
    )
    assert risk.overall_risk == RiskLevel.CRITICAL
    assert risk.is_safe_to_sail is False
    assert risk.risk_score >= 68
    assert any("capsize" in r.lower() or "wave" in r.lower() for r in risk.reasons)

def test_stale_data_uncertainty_penalty():
    risk = risk_engine.evaluate_risk(
        wave_height_m=1.2,
        swell_wave_m=1.0,
        wind_speed_kts=12.0,
        wind_gusts_kts=16.0,
        active_hazards=[],
        is_restricted_zone=False,
        data_freshness=FreshnessStatus.HISTORICAL
    )
    assert risk.freshness_penalty_applied is True
    assert any("delayed" in r.lower() or "latency" in r.lower() for r in risk.reasons)
