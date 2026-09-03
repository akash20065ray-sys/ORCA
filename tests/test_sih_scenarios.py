import pytest
from backend.orchestration.orca_orchestrator import orca_orchestrator
from backend.database.models import RiskLevel

# ----------------------------------------------------
# 1. SIH Query 1: Nearest Potential Fishing Zone Today
# ----------------------------------------------------
def test_sih_query_1_nearest_pfz():
    query = "Where is the nearest Potential Fishing Zone (PFZ) today near Kochi?"
    res = orca_orchestrator.process_query(query)
    
    assert res.pfz_advisories is not None
    assert len(res.pfz_advisories) >= 1
    assert "Kochi" in res.target_location or "Cochin" in res.target_location
    assert res.pfz_advisories[0].bearing_deg >= 0
    assert any("Tuna" in s or "Mackerel" in s for s in res.pfz_advisories[0].species_association)

# ----------------------------------------------------
# 2. SIH Query 2: Sea Safety Tomorrow Morning
# ----------------------------------------------------
def test_sih_query_2_sea_safety():
    query = "Is it safe to venture into the sea tomorrow morning near Chennai?"
    res = orca_orchestrator.process_query(query)
    
    assert "Chennai" in res.target_location
    assert res.risk_assessment is not None
    assert res.telemetry is not None
    assert len(res.execution_trace) >= 6

# ----------------------------------------------------
# 3. SIH Query 3: Tide, Weather & Sea Conditions
# ----------------------------------------------------
def test_sih_query_3_tide_and_weather():
    query = "What are the tide, weather, and sea conditions near my fishing location in Visakhapatnam?"
    res = orca_orchestrator.process_query(query)
    
    assert res.telemetry is not None
    assert res.telemetry.wave_height_meters is not None
    assert any("Tide" in c.parameter or "Wave" in c.parameter for c in res.evidence_citations)

# ----------------------------------------------------
# 4. SIH Query 4: Lightning & Cyclone Alerts
# ----------------------------------------------------
def test_sih_query_4_lightning_and_cyclone_alerts():
    query = "Are there any lightning or cyclone alerts in my area near Chennai?"
    res = orca_orchestrator.process_query(query)
    
    assert res.active_hazards is not None
    assert any(h.advisory_type in ("LIGHTNING", "CYCLONE", "HIGH_WAVE", "SQUALL") for h in res.active_hazards)

# ----------------------------------------------------
# 5. SIH Query 5: Chlorophyll & SST Front Correlation
# ----------------------------------------------------
def test_sih_query_5_chlorophyll_sst_correlation():
    query = "Which regions show high chlorophyll concentration and favourable sea surface temperature near Mangalore?"
    res = orca_orchestrator.process_query(query)
    
    assert res.telemetry.sst_celsius is not None
    assert res.telemetry.chlorophyll_mg_m3 is not None
    assert any("ISRO" in c.source_name or "NOAA" in c.source_name for c in res.evidence_citations)

# ----------------------------------------------------
# 6. SIH Query 6: Safe Fishing Vessel Routing
# ----------------------------------------------------
def test_sih_query_6_safe_vessel_routing():
    query = "What is the safest route for a fishing vessel considering weather and sea-state conditions between Mumbai and Goa?"
    res = orca_orchestrator.process_query(query)
    
    assert res.routes is not None
    assert len(res.routes) == 2
    assert res.routes[1].safety_score >= res.routes[0].safety_score

# ----------------------------------------------------
# 7. SIH Query 7: Fish Productivity Decline Diagnosis
# ----------------------------------------------------
def test_sih_query_7_productivity_decline():
    query = "Why has fish productivity declined in this coastal region near Gulf of Mannar?"
    res = orca_orchestrator.process_query(query)
    
    assert "declined" in res.synthesized_response.lower() or "productivity" in res.synthesized_response.lower()
    assert "Thermal" in res.synthesized_response or "Upwelling" in res.synthesized_response or "SST" in res.synthesized_response

# ----------------------------------------------------
# 8. SIH Query 8: Geofence & Prohibited Zones Avoidance
# ----------------------------------------------------
def test_sih_query_8_geofence_and_prohibited_zones():
    query = "Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions in Palk Strait?"
    res = orca_orchestrator.process_query(query)
    
    assert res.risk_assessment is not None
    assert len(res.execution_trace) >= 5

# ----------------------------------------------------
# 9. Multilingual Regional Language Support
# ----------------------------------------------------
def test_sih_multilingual_tamil_query():
    query = "சென்னையில் நாளை காலை கடலுக்கு செல்வது பாதுகாப்பானதா?"
    res = orca_orchestrator.process_query(query, language="ta")
    
    assert res.risk_assessment is not None
    assert len(res.execution_trace) >= 5

# ----------------------------------------------------
# 10. ISRO Satellite Earth Observation Provenance
# ----------------------------------------------------
def test_sih_isro_earth_observation_provenance():
    query = "Give me satellite ocean observations for Veraval"
    res = orca_orchestrator.process_query(query)
    
    assert any("ISRO" in c.source_name for c in res.evidence_citations)
