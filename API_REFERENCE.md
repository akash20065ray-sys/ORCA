# 📡 ORCA — API Reference

> **ORCA** — Marine EcOsystem Reasoning with Collaborative Agents  
> **Base URL**: `http://127.0.0.1:8000`  
> **OpenAPI Docs**: `http://127.0.0.1:8000/docs`

---

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Orchestrate natural language marine intelligence queries |
| `GET` | `/api/chat/sessions` | List all chat sessions |
| `POST` | `/api/chat/sessions` | Explicitly create a new chat session |
| `DELETE` | `/api/chat/sessions` | Clear all chat sessions |
| `GET` | `/api/chat/sessions/{id}` | Retrieve a specific chat session |
| `DELETE` | `/api/chat/sessions/{id}` | Delete a chat session |
| `GET` | `/api/map/layers` | Get all GIS map layers for Leaflet rendering |
| `GET` | `/api/routes/ports` | List registered coastal ports and harbors |
| `POST` | `/api/routes/analyze` | Calculate marine route comparison (Alpha vs Bravo) |
| `POST` | `/api/routes/waypoints` | High-res turn-by-turn navigation waypoints & steer compass headings |
| `POST` | `/api/routes/reverse` | Compute reverse return voyage |
| `GET` | `/api/pfz/zones` | Get Potential Fishing Zone advisories |
| `GET` | `/api/pfz/forecast` | Alias for PFZ advisories forecast |
| `GET/POST` | `/api/pfz/diagnose-decline` | Ecological diagnostic of fishery decline & actionable recommendations |
| `POST/GET` | `/api/safety/assess` | Deterministic safety score (0–100), Douglas Sea State & Beaufort Force |
| `GET` | `/api/weather/forecast` | Real-time weather, wave, swell, and semi-diurnal tides |
| `GET` | `/api/weather/current` | Current atmospheric and marine telemetry |
| `GET` | `/api/weather/in-situ` | In-situ buoy telemetry from NIOT National Data Buoy Programme |
| `GET` | `/api/weather/buoys` | Oceanographic and coastal buoy registry |
| `GET` | `/api/alerts/active` | Active INCOIS & IMD marine advisories with severity filtering |
| `GET` | `/api/alerts/signals` | Official IMD Port Danger Warning Signals (1 to 11) definitions |
| `POST` | `/api/emergency/distress` | GMDSS Mayday distress transmission to nearest Coast Guard MRCC |
| `GET` | `/api/emergency/mrcc` | Indian Coast Guard Maritime Rescue Coordination Centres registry |
| `GET` | `/api/emergency/status/{token}` | SAR operational response status lookup |
| `POST` | `/api/emergency/cancel/{token}` | Stand down / cancel emergency distress alert |
| `GET` | `/api/emergency/logs` | Recent emergency distress transmission ledger |
| `GET` | `/api/health` | System health and component status |
| `GET` | `/` | Serve frontend application |

---

## 1. Chat & Intelligence

### `POST /api/chat`

Orchestrates a full multi-agent pipeline to answer natural language marine queries.

**Request Body**:
```json
{
  "query": "Is it safe to fish near Kochi tomorrow morning?",
  "session_id": "optional-session-uuid",
  "latitude": 9.9656,
  "longitude": 76.2425,
  "language": "en"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | ✅ | Natural language question about marine conditions |
| `session_id` | `string` | ❌ | Session UUID for conversation continuity |
| `latitude` | `float` | ❌ | User GPS latitude (overrides location in query) |
| `longitude` | `float` | ❌ | User GPS longitude |
| `language` | `string` | ❌ | Response language: `en`, `ta`, `hi`, `ml`, `te`, `bn`, `gu` |

**Response** (`OrchestrationResult`):
```json
{
  "query_id": "a1b2c3d4-...",
  "query_text": "Is it safe to fish near Kochi tomorrow morning?",
  "intent": "sea_safety_assessment",
  "target_location": "Cochin Port (Kochi)",
  "target_coordinates": {"latitude": 9.9656, "longitude": 76.2425},
  "selected_agents": [
    "marine_data_retrieval_agent",
    "weather_intelligence_agent",
    "alert_notification_agent",
    "risk_assessment_agent",
    "geospatial_analysis_agent",
    "response_synthesis_agent"
  ],
  "execution_trace": [
    {
      "agent_name": "planning_agent",
      "agent_title": "1. Planning Agent",
      "status": "completed",
      "duration_ms": 3.45,
      "summary": "Understood intent: 'sea_safety_assessment'. Target: Cochin Port (Kochi). Selected 6 agents.",
      "output_preview": {"intent": "sea_safety_assessment", "selected_agents": ["..."]}
    }
  ],
  "synthesized_response": "### ORCA Marine Decision Assessment: **Cochin Port (Kochi)**\n...",
  "risk_assessment": {
    "overall_risk": "MODERATE",
    "risk_score": 35,
    "is_safe_to_sail": true,
    "wind_risk": "MODERATE",
    "wave_risk": "LOW",
    "hazard_risk": "LOW",
    "freshness_penalty_applied": false,
    "reasons": ["Moderate breeze (15.2 kts, gusts 19.8 kts).", "Favourable wave conditions..."],
    "safety_advisory": "MODERATE RISK. Sea conditions are manageable...",
    "recommended_precautions": ["Life jackets mandatory at all times..."]
  },
  "telemetry": {
    "location_name": "Cochin Port (Kochi)",
    "latitude": 9.9656,
    "longitude": 76.2425,
    "sst_celsius": 29.1,
    "chlorophyll_mg_m3": 0.58,
    "wind_speed_knots": 15.2,
    "wave_height_meters": 1.3,
    "weather_condition": "Partly Cloudy",
    "data_freshness": "LIVE",
    "data_age_hours": 0.2
  },
  "forecast_timeline": [
    {"time": "06:00", "wave_height_m": 1.1, "wind_speed_kts": 12.0, "weather": "Clear"},
    {"time": "09:00", "wave_height_m": 1.3, "wind_speed_kts": 15.0, "weather": "Partly Cloudy"}
  ],
  "pfz_advisories": null,
  "routes": null,
  "active_hazards": [
    {
      "id": "HAZ-001",
      "title": "INCOIS High Wave Alert",
      "advisory_type": "HIGH_WAVE",
      "severity": "ADVISORY",
      "issuing_authority": "INCOIS",
      "region": "Kerala Coast",
      "description": "Moderate wave heights expected..."
    }
  ],
  "evidence_citations": [
    {
      "source_name": "ISRO MOSDAC & NOAA CoastWatch Earth Observation",
      "dataset_name": "ISRO_OCM3_CHLA_L3 / GHRSST_L4_OSTIA",
      "parameter": "Sea Surface Temperature (SST), Chlorophyll-a (OCM-3), Thermal Fronts",
      "timestamp": "Near Real-Time",
      "freshness": "NEAR_REAL_TIME",
      "quality": "VALIDATED",
      "latency_note": "Satellite pass latency: 6.0 hours (ISRO Oceansat-3 & NOAA)"
    }
  ],
  "processing_time_ms": 1250.34
}
```

**Status Codes**:
| Code | Description |
|---|---|
| `200` | Success — full orchestration result returned |
| `400` | Bad Request — empty query |
| `500` | Internal error — agent orchestration failure |

---

### `GET /api/chat/sessions`

Returns all stored chat sessions (most recent first).

**Response**:
```json
[
  {
    "session_id": "abc-123",
    "title": "Is it safe to fish near Kochi tomorrow...",
    "created_at": 1725550000.0,
    "updated_at": 1725550120.0,
    "message_count": 3
  }
]
```

---

### `GET /api/chat/sessions/{session_id}`

Retrieves a specific chat session with full message history.

### `DELETE /api/chat/sessions/{session_id}`

Deletes a chat session from memory.

---

## 2. Geospatial & Map Layers

### `GET /api/map/layers`

Returns all spatial layers for Leaflet.js map rendering.

**Query Parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `center_lat` | `float` | `13.0827` | Center latitude for spatial query |
| `center_lon` | `float` | `80.2707` | Center longitude |
| `radius_deg` | `float` | `2.5` | Bounding radius in degrees |

**Response**:
```json
{
  "center": {"lat": 13.0827, "lon": 80.2707},
  "gis_zones": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "id": "ZONE-EEZ-INDIA",
          "name": "Indian Exclusive Economic Zone",
          "zone_type": "EEZ",
          "is_restricted": false
        },
        "geometry": {"type": "Polygon", "coordinates": [[...]]}
      }
    ]
  },
  "sst_grid": [
    {"lat": 12.0, "lon": 79.5, "sst": 28.7, "chl": 0.45}
  ],
  "hazards": [...],
  "ports": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {"id": "chennai", "name": "Chennai Port", "state": "Tamil Nadu"},
        "geometry": {"type": "Point", "coordinates": [80.2707, 13.0827]}
      }
    ]
  },
  "buoys": {
    "type": "FeatureCollection",
    "features": [...]
  }
}
```

---

## 3. Marine Routing

### `POST /api/routes/analyze`

Calculates and compares two marine routes: Route Alpha (direct coastal) and Route Bravo (deep-water MPA bypass).

**Request Body**:
```json
{
  "origin": "chennai",
  "destination": "vizag",
  "vessel_speed_knots": 12.0
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `origin` | `string` | ✅ | Port name or "lat,lon" string |
| `destination` | `string` | ✅ | Destination port name or coordinates |
| `vessel_speed_knots` | `float` | ❌ | Vessel cruising speed (default: 12.0) |

**Response** (`List[CandidateRoute]`):
```json
[
  {
    "route_id": "ROUTE-ALPHA-DIRECT",
    "route_name": "Route Alpha: Direct Coastal Channel (Chennai Port → Visakhapatnam Port)",
    "total_distance_km": 685.2,
    "total_distance_nm": 370.1,
    "estimated_duration_hours": 30.8,
    "safety_score": 82,
    "risk_level": "LOW",
    "waypoints": [
      {
        "index": 0,
        "name": "Departure Point",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "segment_distance_nm": 0.0,
        "cumulative_distance_nm": 0.0,
        "wave_height_m": 1.2,
        "wind_speed_kts": 14.0,
        "hazard_proximity_km": 35.0,
        "is_safe": true
      }
    ],
    "weather_summary": "Moderate swell of 1.4m - 1.7m along coastal corridor; wind 14-18 knots.",
    "avoided_hazards": [],
    "recommendation_verdict": "Fastest navigable track with standard coastal clearance."
  },
  {
    "route_id": "ROUTE-BRAVO-SAFE-BYPASS",
    "route_name": "Route Bravo: Deep-Water & Eco-Zone Bypass Track",
    "safety_score": 94,
    "risk_level": "LOW",
    "recommendation_verdict": "RECOMMENDED: Maximizes safety margin and completely clears sensitive marine zones."
  }
]
```

---

## 4. Potential Fishing Zones

### `GET /api/pfz/zones`

Returns INCOIS-calibrated Potential Fishing Zone advisories for any coastal area.

**Query Parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `port_name` | `string` | `"kochi"` | Reference coastal port name |
| `lat` | `float` | `null` | Custom latitude (overrides port_name) |
| `lon` | `float` | `null` | Custom longitude |

**Response** (`List[PFZAdvisory]`):
```json
[
  {
    "id": "PFZ-996-7624-01",
    "zone_name": "PFZ Hotspot 1: ENE of Cochin Port (Kochi)",
    "latitude": 10.2456,
    "longitude": 76.6925,
    "sst_celsius": 29.3,
    "sst_gradient_deg_km": 0.62,
    "chlorophyll_mg_m3": 0.85,
    "distance_km": 55.2,
    "distance_nm": 29.8,
    "bearing_deg": 68.4,
    "bearing_cardinal": "ENE",
    "reference_port": "Cochin Port (Kochi)",
    "depth_meters": 65,
    "confidence_score": 0.96,
    "validity_hours": 24,
    "species_association": ["Yellowfin Tuna", "Indian Mackerel", "Sardines"]
  }
]
```

---

## 5. Marine Safety Assessment

### `POST /api/safety/assess` & `GET /api/safety/assess`

Evaluates deterministic sea safety score (0–100), Douglas Sea State (0–9), Beaufort Wind Force (0–12), and sail advisories tailored to vessel type.

**POST Body / GET Query Parameters**:
```json
{
  "port_name": "kochi",
  "vessel_type": "artisanal_fishing_craft",
  "latitude": 9.9656,
  "longitude": 76.2425
}
```

**Response**:
```json
{
  "location": {
    "name": "Cochin Port (Kochi, Kerala)",
    "latitude": 9.9656,
    "longitude": 76.2425
  },
  "safety_score": 75,
  "risk_score": 25,
  "overall_risk": "LOW",
  "sail_verdict": "SAFE_TO_SAIL",
  "is_safe_to_sail": true,
  "advisory_headline": "LOW RISK. Favourable conditions for coastal fishing.",
  "metrics": {
    "wave_height_meters": 1.2,
    "swell_height_meters": 1.0,
    "douglas_sea_state": 3,
    "wind_speed_knots": 14.0,
    "wind_gusts_knots": 18.0,
    "beaufort_wind_force": 4
  },
  "causal_factors": [
    "Wave height is within safe operational limits for artisanal_fishing_craft."
  ],
  "mandatory_precautions": [
    "Life jackets mandatory for all crew.",
    "Carry operational VHF radio tuned to Channel 16."
  ],
  "vessel_profile": "artisanal_fishing_craft"
}
```

---

## 6. Ocean Weather Station & Tides

### `GET /api/weather/forecast` & `GET /api/weather/current`

Real-time multi-source ocean weather and semi-diurnal coastal tides.

**Query Parameters**:
- `port`: Port name or coastal city (default: `"kochi"`)
- `lat`: Custom latitude (optional)
- `lon`: Custom longitude (optional)
- `hours`: Forecast horizon in hours (default: 24, max 72)

**Response**:
Includes atmospheric parameters, wave state, sea surface temperature, and astronomical tidal predictions with flood/ebb indicators.

### `GET /api/weather/in-situ` & `GET /api/weather/buoys`

Real-time telemetry and directory of the NIOT National Data Buoy Programme (OMNI & coastal buoys).

---

## 7. Marine Advisories & IMD Port Signals

### `GET /api/alerts/active`

Fetches active INCOIS High Wave Alerts, Swell Surges (Kallakkadal), and IMD Squall warnings with optional filtering by `region`, `severity` (WARNING, ADVISORY), or `advisory_type`.

### `GET /api/alerts/signals`

Returns the official definitions, day shapes, and night lights for IMD Port Danger Warning Signals No. 1 through 11.

---

## 8. Maritime Emergency & Coast Guard SOS

### `POST /api/emergency/distress`

Simulates / dispatches official GMDSS Mayday distress transmission to the nearest Indian Coast Guard Maritime Rescue Coordination Centre (MRCC: Kochi, Mumbai, Chennai, Port Blair).

**Request Body**:
```json
{
  "vessel_id": "IND-KL-07-ORCA",
  "callsign": "ORCA-INDIA",
  "latitude": 9.9312,
  "longitude": 76.2673,
  "crew_count": 4,
  "distress_type": "ENGINE_FAILURE_DRIFT",
  "sea_state": "Moderate Swell 1.4m · Wind 16 kt",
  "description": "Engine failure offshore. Drifting westward."
}
```

**Response**:
Returns dispatch token (e.g. `GMDSS-MRCC-KOC-12345`), nearest MRCC, distance in nautical miles, Fast Interceptor Craft ETA, and formatted GMDSS Mayday broadcast message.

### `GET /api/emergency/mrcc`

Returns directory of all 4 Indian Coast Guard MRCC stations with contact telephone hotlines, VHF Channel 16, and DSC Channel 70 frequencies.

### `GET /api/emergency/status/{dispatch_token}` & `POST /api/emergency/cancel/{dispatch_token}`

Allows active tracking of search & rescue response status and official stand-down/cancellation.

---

## 9. Navigation Waypoints & Coastal Ports

### `GET /api/routes/ports`

Lists 34 registered Indian coastal ports, fishing harbors, and anchorages with coordinates and administrative states.

### `POST /api/routes/waypoints`

Generates turn-by-turn navigation waypoints with compass steer headings (e.g., `Steer 142° SE`), leg distances, cumulative nautical miles, wave swell, and clearance margins.

### `POST /api/routes/reverse`

Computes reverse return passage from destination back to origin.

---

## 10. System Health

### `GET /api/health`

Returns system health status and component connectivity.

**Response**:
```json
{
  "status": "healthy",
  "system": "ORCA — Agentic AI for Ocean Intelligence",
  "sih_problem_id": "SIH26176",
  "version": "1.0.0",
  "timestamp": 1725550000.0,
  "components": {
    "orchestrator": "active (8 specialized agents)",
    "llm_engine": "Deterministic Grounded Heuristics Engine",
    "database_gis": "Embedded PostGIS Spatial Index Engine",
    "connectors": {
      "open_meteo_marine": "operational",
      "noaa_copernicus_sst_chl": "operational",
      "incois_imd_advisories": "operational",
      "maritime_gis_boundaries": "operational",
      "in_situ_buoy_network": "operational"
    },
    "engines": {
      "deterministic_risk_engine": "active",
      "deterministic_route_engine": "active",
      "incois_pfz_engine": "active"
    }
  }
}
```

---

## Example Queries for Testing

| Query | Expected Intent | Key Agents Activated |
|---|---|---|
| "Is it safe to go to sea from Chennai tomorrow?" | `sea_safety_assessment` | Weather, Alert, Risk, Geospatial |
| "Safest route from Mumbai to Goa" | `marine_routing` | Weather, Alert, Risk, Geospatial (routing) |
| "Where are the nearest fishing zones near Kochi?" | `potential_fishing_zone` | Ocean Analytics, PFZ Engine |
| "Why has fish catch declined near Vizag?" | `productivity_decline_analysis` | Ocean Analytics, Geospatial |
| "Show lightning and cyclone warnings for Bay of Bengal" | `lightning_and_cyclone_alerts` | Alert, Weather, Risk |
| "Am I near any restricted zones at 9.5, 79.0?" | `geofencing_and_restricted_zones` | Alert, Geospatial, Risk |
| "What are current tides and sea conditions at Tuticorin?" | `tide_and_sea_conditions` | Marine Retrieval, Weather, Ocean Analytics |
| "Show SST thermal fronts and chlorophyll near Paradip" | `chlorophyll_sst_correlation` | Marine Retrieval, Ocean Analytics |

---

*ORCA API Reference v1.0 — SIH 2026 (Problem ID: SIH26176)*
