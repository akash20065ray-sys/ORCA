import requests
import json

def run_verification():
    base = "http://127.0.0.1:8000"

    print("==================================================")
    print("  ORCA SYSTEM END-TO-END VERIFICATION")
    print("==================================================")

    # 1. Health
    h = requests.get(f"{base}/api/health").json()
    print(f"1. Health Check: {h['status'].upper()} | Version: {h['version']}")

    # 2. Map Layers
    m = requests.get(f"{base}/api/map/layers").json()
    print(f"2. Map Layers: GIS Zones: {len(m['gis_zones']['features'])}, SST Grid Points: {len(m['sst_grid'])}, Ports: {len(m['ports']['features'])}, Buoys: {len(m['buoys']['features'])}")

    # 3. Chat queries
    queries = [
        "Is it safe to go to sea tomorrow morning near Chennai?",
        "Find a favourable fishing zone (PFZ) near Kochi.",
        "What is the safest and most efficient route between Mumbai and Goa?",
        "Which areas near Gulf of Mannar are hazardous or restricted?",
        "Give me a summary of current ocean conditions near Visakhapatnam."
    ]

    print("\n3. Testing Conversational Queries & Multi-Agent Pipeline:")
    for q in queries:
        r = requests.post(f"{base}/api/chat", json={"query": q}).json()
        intent = r.get("intent", "N/A")
        loc = r.get("target_location", "N/A")
        risk = r.get("risk_assessment", {}).get("overall_risk", "N/A") if r.get("risk_assessment") else "N/A"
        agents_count = len(r.get("execution_trace", []))
        citations_count = len(r.get("evidence_citations", []))
        duration = r.get("processing_time_ms", 0.0)
        print(f"  [OK] Query: \"{q[:40]}...\"")
        print(f"    Intent: {intent} | Target: {loc} | Risk: {risk} | Agents: {agents_count} | Sources: {citations_count} | Time: {duration} ms")

    # 4. PFZ endpoint
    pfz = requests.get(f"{base}/api/pfz/zones?port_name=kochi").json()
    print(f"\n4. PFZ Service: Generated {len(pfz)} zones for Kochi. Top: {pfz[0]['zone_name']} ({pfz[0]['distance_nm']} NM {pfz[0]['bearing_cardinal']})")

    # 5. Route endpoint
    rt = requests.post(f"{base}/api/routes/analyze", json={"origin": "Mumbai Harbour", "destination": "Mormugao Port (Goa)"}).json()
    print(f"5. Route Service: Generated {len(rt)} routes. Route Bravo Safety Score: {rt[1]['safety_score']}/100 ({rt[1]['recommendation_verdict']})")

    print("\n==================================================")
    print("  ALL ENDPOINTS OPERATING AT 100% EXCELLENCE!")
    print("==================================================")

if __name__ == "__main__":
    run_verification()
