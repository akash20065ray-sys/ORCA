import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_endpoints():
    # 1. Frontend index.html
    res = client.get("/")
    assert res.status_code == 200
    assert "windy_animator.js" in res.text or "root" in res.text or "assets" in res.text
    print("[PASS] 1. Frontend root loads with React enterprise SPA or static fallback")

    # 2. Static windy_animator.js
    res = client.get("/static/js/windy_animator.js")
    assert res.status_code == 200
    assert "OrcaWindyAnimator" in res.text
    print("[PASS] 2. /static/js/windy_animator.js loads successfully")

    # 3. Route Calculation with Custom Coordinates
    payload = {
        "origin": "kochi",
        "destination": "9.85, 75.80",
        "vessel_speed_knots": 12.0
    }
    res = client.post("/api/routes/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    r_bravo = data[1]
    wp = r_bravo["waypoints"][1]
    assert wp.get("steer_instruction") is not None
    print(f"[PASS] 3. Route Bravo: {r_bravo['total_distance_nm']} NM | Steer Instruction: {wp.get('steer_instruction')}")

    # 4. Map Layers API
    res = client.get("/api/map/layers")
    assert res.status_code == 200
    layers = res.json()
    assert len(layers["gis_zones"]["features"]) > 0
    print(f"[PASS] 4. Map layers loaded: {len(layers['gis_zones']['features'])} GIS zones, {len(layers['sst_grid'])} SST points")

if __name__ == "__main__":
    test_endpoints()
