import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_emergency_distress_beacon():
    payload = {
        "vessel_id": "IND-KL-07-ORCA",
        "callsign": "ORCA-INDIA",
        "latitude": 9.9312,
        "longitude": 76.2673,
        "crew_count": 4,
        "sea_state": "Moderate Swell 1.4m · Wind 16 kt",
        "distress_type": "ENGINE_FAILURE_DRIFT"
    }
    res = client.post("/api/emergency/distress", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "TRANSMITTED_AND_LOGGED"
    assert "GMDSS-MRCC" in data["dispatch_token"]
    assert "Kochi" in data["nearest_mrcc"]["name"]
    assert data["sar_response_eta_minutes"] > 0
    assert "MAYDAY MAYDAY MAYDAY" in data["gmdss_message"]

    # Test status lookup
    token = data["dispatch_token"]
    res_status = client.get(f"/api/emergency/status/{token}")
    assert res_status.status_code == 200
    assert res_status.json()["found"] is True

    # Test stand down / cancel
    res_cancel = client.post(f"/api/emergency/cancel/{token}?reason=Engine+restarted+successfully")
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "CANCELLED_STOOD_DOWN"
    print(f"[PASS] Emergency SOS Lifecycle: Token {token} -> Broadcasted, Tracked & Stood Down")

def test_emergency_mrcc_registry():
    res = client.get("/api/emergency/mrcc")
    assert res.status_code == 200
    data = res.json()
    assert data["total_stations"] >= 4
    assert any("Kochi" in s["name"] for s in data["stations"])
    print(f"[PASS] MRCC Registry: {data['total_stations']} Coast Guard SAR stations active")

def test_weather_forecast_endpoint():
    res = client.get("/api/weather/forecast?port=kochi&hours=24")
    assert res.status_code == 200
    data = res.json()
    assert "location" in data
    assert "Cochin" in data["location"]["name"] or "Kochi" in data["location"]["name"]
    assert "current" in data
    assert "temperature_celsius" in data["current"]
    assert "tides" in data
    assert len(data["timeline"]) > 0
    print(f"[PASS] Weather Station: {data['location']['name']} | Temp: {data['current']['temperature_celsius']}°C | Wave: {data['current']['wave_height_meters']}m")

def test_weather_in_situ_and_buoys():
    res_buoys = client.get("/api/weather/buoys")
    assert res_buoys.status_code == 200
    buoys_data = res_buoys.json()
    assert buoys_data["total_buoys"] >= 8

    res_insitu = client.get("/api/weather/in-situ?buoy_id=BUOY-CB02")
    assert res_insitu.status_code == 200
    insitu_data = res_insitu.json()
    assert "buoy_telemetry" in insitu_data
    print(f"[PASS] In-Situ Telemetry: {buoys_data['total_buoys']} ocean buoys registered")

def test_alerts_active_and_signals():
    res = client.get("/api/alerts/active")
    assert res.status_code == 200
    data = res.json()
    assert "total_active_alerts" in data
    assert len(data["alerts"]) > 0

    # Test severity filtering
    res_filtered = client.get("/api/alerts/active?severity=WARNING")
    assert res_filtered.status_code == 200
    filtered_data = res_filtered.json()
    assert "alerts" in filtered_data

    res_sig = client.get("/api/alerts/signals")
    assert res_sig.status_code == 200
    sig_data = res_sig.json()
    assert sig_data["total_signals"] == 11
    print(f"[PASS] Alerts & Port Signals: {data['total_active_alerts']} active bulletins, {sig_data['total_signals']} IMD signals")

def test_safety_assess_endpoint():
    payload = {
        "port_name": "kochi",
        "vessel_type": "artisanal_fishing_craft"
    }
    res = client.post("/api/safety/assess", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert 0 <= data["safety_score"] <= 100
    assert data["overall_risk"] in ("LOW", "MODERATE", "HIGH", "CRITICAL")
    assert data["metrics"]["douglas_sea_state"] >= 0
    assert data["metrics"]["beaufort_wind_force"] >= 0

    # Also test GET
    res_get = client.get("/api/safety/assess?port_name=kochi&vessel_type=deep_sea_trawler")
    assert res_get.status_code == 200
    data_get = res_get.json()
    assert "safety_score" in data_get
    print(f"[PASS] Sea Safety: Score {data['safety_score']}/100 | Risk: {data['overall_risk']} | Douglas: State {data['metrics']['douglas_sea_state']}")

def test_pfz_zones_and_diagnostics():
    res_zones = client.get("/api/pfz/zones?port_name=kochi")
    assert res_zones.status_code == 200
    zones = res_zones.json()
    assert len(zones) >= 1
    assert "sst_celsius" in zones[0]

    # Test forecast alias
    res_forecast = client.get("/api/pfz/forecast?port_name=kochi")
    assert res_forecast.status_code == 200

    # Test decline diagnostic
    res_diag = client.get("/api/pfz/diagnose-decline?region=Gulf+of+Mannar")
    assert res_diag.status_code == 200
    diag_data = res_diag.json()
    assert len(diag_data["primary_ecological_factors"]) > 0
    assert len(diag_data["actionable_restoration_advice"]) > 0
    print(f"[PASS] PFZ & Ecological Diagnostics: {len(zones)} hotspots found | Diagnostics valid")

def test_routes_endpoints():
    # Ports list
    res_ports = client.get("/api/routes/ports")
    assert res_ports.status_code == 200
    ports = res_ports.json()
    assert ports["total_ports"] >= 10

    # Waypoints
    payload = {
        "origin": "Mumbai",
        "destination": "Goa",
        "vessel_speed_knots": 12.0
    }
    res_wp = client.post("/api/routes/waypoints", json=payload)
    assert res_wp.status_code == 200
    wp_data = res_wp.json()
    assert wp_data["waypoints_count"] >= 4

    # Reverse route
    res_rev = client.post("/api/routes/reverse", json=payload)
    assert res_rev.status_code == 200
    assert len(res_rev.json()) == 2
    print(f"[PASS] Marine Routing & Waypoints: {ports['total_ports']} ports | Turn-by-turn navigation valid")

def test_chat_sessions_lifecycle():
    # Create session
    res_create = client.post("/api/chat/sessions?title=Test+Sea+Safety+Briefing")
    assert res_create.status_code == 200
    s_id = res_create.json()["session_id"]

    # List sessions
    res_list = client.get("/api/chat/sessions")
    assert res_list.status_code == 200
    assert any(s["session_id"] == s_id for s in res_list.json())

    # Get single session
    res_get = client.get(f"/api/chat/sessions/{s_id}")
    assert res_get.status_code == 200
    assert res_get.json()["title"] == "Test Sea Safety Briefing"

    # Delete single session
    res_del = client.delete(f"/api/chat/sessions/{s_id}")
    assert res_del.status_code == 200
    print(f"[PASS] Chat Session Lifecycle: Create, Read, List, and Delete verified")

if __name__ == "__main__":
    test_emergency_distress_beacon()
    test_emergency_mrcc_registry()
    test_weather_forecast_endpoint()
    test_weather_in_situ_and_buoys()
    test_alerts_active_and_signals()
    test_safety_assess_endpoint()
    test_pfz_zones_and_diagnostics()
    test_routes_endpoints()
    test_chat_sessions_lifecycle()
