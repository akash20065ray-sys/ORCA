# 🧠 ORCA BRAIN — System Intelligence Architecture

> **ORCA** — Marine EcOsystem Reasoning with Collaborative Agents  
> **Smart India Hackathon 2026** | Problem Statement ID: `SIH26176`

---

## 🔬 Core Philosophy

ORCA is not a chatbot — it is a **multi-agent decision-support system** built on the principle of **Grounded Intelligence**:

1. **The LLM (Claude 3.5 Sonnet) never fabricates data.** It only understands intent, decomposes tasks, selects agents, and synthesizes grounded outputs.
2. **All measurements, coordinates, risk scores, wave heights, wind speeds, SST values, and hazard levels are computed deterministically** by specialized scientific engines.
3. **Every response carries full Data Provenance** — satellite source, dataset name, observation timestamp, retrieval latency, and quality flag.

> **Zero-Hallucination Guarantee**: If the LLM is unavailable (no API key), ORCA continues to operate at full capability using its built-in deterministic heuristic engines and structured synthesis pipeline.

---

## 🧬 Intelligence Pipeline (Execution Sequence)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USER QUERY + GPS LOCATION                     │
│   "Is it safe to fish near Kochi tomorrow? Show nearest PFZs."       │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STEP 1 — PLANNING AGENT (LLM Intent Decomposition)                 │
│  • Extracts: intent, target_location, coordinates, timeframe         │
│  • Selects: which of the 8 agents to activate                        │
│  • Resolves: location from 35+ indexed Indian coastal ports          │
│  • Output: Structured execution plan (JSON)                          │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STEP 2 — MARINE DATA RETRIEVAL AGENT                                │
│  • Fetches: Open-Meteo Marine + Atmospheric live feed                │
│  • Fetches: NOAA/ISRO SST + Chlorophyll-a satellite data             │
│  • Fetches: In-situ OMNI buoy telemetry + tide gauges                │
│  • Normalizes observations & stores in PostGIS/Supabase              │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────────┐
              ▼                 ▼                     ▼
┌─────────────────────┐ ┌──────────────────┐ ┌────────────────────────┐
│  STEP 3: OCEAN      │ │  STEP 4: WEATHER │ │  STEP 5: ALERT &       │
│  ANALYTICS AGENT    │ │  INTELLIGENCE    │ │  NOTIFICATION AGENT    │
│  • SST analysis     │ │  AGENT           │ │  • INCOIS High Wave    │
│  • Chlorophyll-a    │ │  • Wind vectors  │ │  • IMD Damini Lightning│
│  • Thermal fronts   │ │  • Wave height   │ │  • Cyclone tracks      │
│  • PFZ generation   │ │  • Swell/period  │ │  • Port Danger Signals │
│  • Upwelling detect │ │  • Douglas scale │ │    (Signals 1-11)      │
│  • Decline diagnosis│ │  • Beaufort wind │ │  • Rough sea bulletins │
└─────────┬───────────┘ └────────┬─────────┘ └──────────┬─────────────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STEP 6 — RISK ASSESSMENT AGENT                                      │
│  • Deterministic multi-factor safety scoring (0–100)                 │
│  • Causal factor decomposition (wave, wind, hazard, geofence)        │
│  • Risk levels: LOW / MODERATE / HIGH / CRITICAL                     │
│  • Sail/No-Sail binary verdict with advisory text                    │
│  • Data freshness penalty (stale data → +8 uncertainty margin)       │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STEP 7 — GEOSPATIAL ANALYSIS AGENT                                  │
│  • PostGIS point-in-polygon intersection queries                     │
│  • IMBL geofence proximity alarms (< 12 NM warning)                  │
│  • Marine Protected Area (MPA) sanctuary checks                      │
│  • Obstacle-avoiding Route Alpha (coastal) vs Route Bravo (deep-sea) │
│  • Nearest port resolution from 35+ registry entries                 │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STEP 8 — RESPONSE SYNTHESIS AGENT                                   │
│  • Grounded LLM synthesis with strict evidence citations             │
│  • Multilingual output (English, Tamil, Hindi, Malayalam, Telugu,     │
│    Bengali, Gujarati)                                                 │
│  • Deterministic markdown fallback when LLM is offline               │
│  • Full Data Provenance: Source → Dataset → Timestamp → Latency      │
│  • ISRO, NOAA, INCOIS, IMD, SOI citations embedded                   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  INTERACTIVE MARINE-TECH INTERFACE                                   │
│  • Chat HUD with agent execution trace visualization                 │
│  • Leaflet.js ocean map with SST heatmaps, GIS zones, routes         │
│  • Real-time telemetry gauges and forecast timeline charts            │
│  • Web Speech API for multilingual voice input/output                 │
│  • Responsive PWA with offline caching (Service Worker)              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 The 8 Specialized Agents — Deep Dive

### Agent 1: Planning Agent (`planning_agent.py`)

| Attribute | Detail |
|---|---|
| **Role** | LLM-powered orchestrator and task decomposer |
| **Input** | Raw natural language query + optional GPS coordinates |
| **Output** | Structured JSON plan: `intent`, `target_location`, `coordinates`, `selected_agents`, `requires_routing`, `requires_pfz`, `requires_risk_assessment` |
| **LLM Usage** | Intent classification, entity extraction, agent selection |
| **Grounding** | Coordinates reconciled against 35+ indexed Indian coastal ports via `COASTAL_PORT_REGISTRY` |
| **Fallback** | Full deterministic keyword-based intent parser supporting 10+ SIH query categories |

**Supported Intent Categories**:
- `sea_safety_assessment` — "Is it safe to go to sea tomorrow?"
- `marine_routing` — "Safest route from Chennai to Vizag"
- `potential_fishing_zone` — "Where are the nearest PFZs near Kochi?"
- `productivity_decline_analysis` — "Why has fish catch declined?"
- `lightning_and_cyclone_alerts` — "Any lightning or cyclone warnings?"
- `chlorophyll_sst_correlation` — "Show SST and chlorophyll thermal fronts"
- `geofencing_and_restricted_zones` — "Am I near IMBL or an MPA?"
- `tide_and_sea_conditions` — "What are current tide and sea conditions?"
- `ocean_condition_telemetry` — "Show SST, wave height, and wind data"
- `general_marine_query` — Catch-all for unstructured queries

---

### Agent 2: Marine Data Retrieval Agent (`marine_data_retrieval_agent.py`)

| Attribute | Detail |
|---|---|
| **Role** | Multi-source real-time data ingestion coordinator |
| **Data Sources** | Open-Meteo Marine API, NOAA CoastWatch, ISRO OCM-3, INCOIS Buoys |
| **Output** | Normalized `marine_weather`, `ocean_data`, `buoy_data` dictionaries |
| **Storage** | Observations persisted to Supabase PostGIS / local spatial engine |

**Data Connector Chain**:
1. `open_meteo.py` → Marine + Atmospheric parameters (wave, wind, swell, pressure, weather)
2. `ocean_sst_chl.py` → SST (GHRSST L4) + Chlorophyll-a (MODIS-Aqua/OCM-3)
3. `in_situ.py` → OMNI deep-sea buoys + coastal wave rider telemetry + tide gauges

---

### Agent 3: Ocean Analytics Agent (`ocean_analytics_agent.py`)

| Attribute | Detail |
|---|---|
| **Role** | Satellite Earth Observation analysis and PFZ intelligence |
| **Capabilities** | SST gradient edge detection, chlorophyll front analysis, thermal stratification diagnosis, productivity decline explanation |
| **PFZ Engine** | Generates 3 candidate Potential Fishing Zones with dynamic confidence scoring based on live SST gradients + Chl-a + thermal fronts |

**PFZ Confidence Scoring Algorithm**:
- Base confidence from zone position (0.80–0.90)
- `+0.06` if thermal front detected (gradient ≥ 0.5°C/km)
- `+0.05` if Chl-a ≥ 1.0 mg/m³ (phytoplankton bloom)
- `-0.08` penalty for oligotrophic waters (Chl-a < 0.3 mg/m³)
- `-0.05` penalty for SST outside 25–30°C productive range
- `+0.02` bonus for live satellite data
- Final score clamped to [0.40, 0.99]

---

### Agent 4: Weather Intelligence Agent (`weather_intelligence_agent.py`)

| Attribute | Detail |
|---|---|
| **Role** | Wind vectors, sea state classification, wave/swell analysis |
| **Scales** | Beaufort Wind Force Scale (0–12), Douglas Sea State Scale (0–9) |
| **Output** | `wind_speed_knots`, `wind_gusts_knots`, `wave_height_meters`, `swell_wave_meters`, `sea_state_description`, `beaufort_force` |

---

### Agent 5: Alert & Notification Agent (`alert_notification_agent.py`)

| Attribute | Detail |
|---|---|
| **Role** | Government marine safety bulletin aggregation |
| **Sources** | INCOIS Ocean State Forecast, IMD Damini Lightning Network, IMD Cyclone Warning Centre, Indian Coast Guard |
| **Advisory Types** | `HIGH_WAVE`, `SQUALL`, `CYCLONE`, `PORT_WARNING`, `ROUGH_SEA`, `LIGHTNING` |
| **Port Signals** | IMD Port Danger Signals 1–11 |

---

### Agent 6: Risk Assessment Agent (`risk_assessment_agent.py`)

| Attribute | Detail |
|---|---|
| **Role** | Deterministic multi-parameter safety scoring |
| **Engine** | `risk_engine.py` — Pure rule-based, zero LLM involvement |
| **Factors** | Wave risk, Wind risk, Hazard bulletin risk, Geofence proximity, Data freshness penalty |
| **Output** | `RiskAssessment` with `overall_risk`, `risk_score` (0–100), `is_safe_to_sail`, causal `reasons[]`, `safety_advisory`, `recommended_precautions[]` |

**Risk Matrix**:
| Score Range | Risk Level | Sail Decision |
|---|---|---|
| 0–25 | `LOW` | ✅ Safe |
| 26–47 | `MODERATE` | ⚠️ Safe with caution |
| 48–67 | `HIGH` | ❌ Not recommended |
| 68–100 | `CRITICAL` | 🚫 Do not venture |

---

### Agent 7: Geospatial Analysis Agent (`geospatial_analysis_agent.py`)

| Attribute | Detail |
|---|---|
| **Role** | PostGIS spatial queries, IMBL geofencing, obstacle-avoiding routing |
| **Spatial Engine** | Ray-casting point-in-polygon, centroid distance queries, bounding-box spatial search |
| **Routing** | Route Alpha (Direct Coastal Channel) vs Route Bravo (Deep-Water MPA Bypass) |
| **Geofencing** | IMBL proximity alarms at < 12 NM threshold |
| **Zone Types** | EEZ, MPA, RESTRICTED_NAVAL, SHIPPING_LANE, CORAL_REEF, PORT |

---

### Agent 8: Response Synthesis Agent (`response_synthesis_agent.py`)

| Attribute | Detail |
|---|---|
| **Role** | Evidence-grounded natural language report generation |
| **LLM Mode** | Claude synthesis with strict grounding rules — never invents measurements |
| **Offline Mode** | Full deterministic structured markdown report builder |
| **Languages** | English, Tamil (ta), Hindi (hi), Malayalam (ml), Telugu (te), Bengali (bn), Gujarati (gu) |
| **Citations** | 5 source categories: ISRO/NOAA EO, Open-Meteo, INCOIS/IMD, SOI/NIOT, PostGIS GIS |

---

## 📡 Data Provenance & Evidence Chain

Every ORCA response embeds a complete **Source Citation Ledger**:

| # | Source | Dataset ID | Parameters | Latency |
|---|---|---|---|---|
| 1 | ISRO MOSDAC & NOAA CoastWatch | ISRO_OCM3_CHLA_L3 / GHRSST_L4_OSTIA | SST, Chlorophyll-a, Thermal Fronts | ~6h satellite pass |
| 2 | Open-Meteo Marine & Atmospheric | ECMWF_IFS_WAVE_025 / GFS_METEO | Wave Height, Swell, Wind, Pressure | ~0.2h live |
| 3 | INCOIS & IMD | INCOIS-OSF / IMD-DAMINI-LIGHTNING | High Wave Alerts, Lightning, Cyclones | Real-time |
| 4 | Survey of India & NIOT | SOI-TIDE-GAUGE / OMNI-BUOY-MET | Tide Height, Current Drift | In-situ sensor |
| 5 | National Maritime GIS | POSTGIS-INDIA-EEZ-IMBL-MPA-2026 | IMBL, Marine Sanctuaries, EEZ | Static geodetic |

**Data Freshness Classification**:
- `LIVE` — < 3 hours old
- `NEAR_REAL_TIME` — 3–12 hours old
- `DELAYED` — 12–48 hours old (triggers +8 risk penalty)
- `HISTORICAL` — > 48 hours old (triggers +8 risk penalty)

---

## 🗄️ Data Layer

### Static Datasets (`data/`)

| File | Purpose |
|---|---|
| `maritime_boundaries.geojson` | EEZ, IMBL, MPA, Naval Zone GeoJSON polygons |
| `incois_pfz_zones.json` | INCOIS historical PFZ calibration data |
| `live_marine_weather.json` | Pre-seeded marine weather cache |
| `noaa_isro_sst_chl_grid.json` | SST/Chl-a satellite observation grid |
| `incois_omni_buoy_telemetry.json` | OMNI deep-sea buoy positions and telemetry |
| `imd_port_danger_signals.json` | IMD port danger signal definitions (1–11) |
| `cmfri_fish_landings_stats.json` | CMFRI historical fish landing statistics |
| `gebco_bathymetry_soundings.json` | GEBCO ocean floor depth soundings |

### Spatial Index Engine (`database/spatial_index.py`)

- **Point-in-polygon**: Ray-casting algorithm for zone containment queries
- **Centroid distance**: Haversine-based proximity search for nearby zones
- **Bounding box**: Latitude/longitude rectangle for efficient spatial filtering

### Supabase / PostGIS (`database/supabase.py`)

- Optional cloud database for persistent observation storage
- Falls back to in-memory spatial engine when credentials are not configured
- Query audit trail logging for analytics

---

## 🌊 Deterministic Scientific Engines

### Risk Engine (`services/risk_engine.py`)
- 5-component weighted safety scoring: Wave + Wind + Hazard + Geofence + Freshness
- Beaufort Scale (wind) and Douglas Scale (sea state) classification
- Automatic sail/no-sail binary verdict with causal explanation

### Route Engine (`services/route_engine.py`)
- Dual-route generation: Alpha (direct coastal) vs Bravo (deep-water bypass)
- Seaward parabolic arc waypoint interpolation
- Per-waypoint weather condition simulation
- Safety scoring with MPA/restricted zone proximity checks

### PFZ Engine (`services/pfz_engine.py`)
- ISRO/INCOIS-calibrated Potential Fishing Zone identification
- Dynamic confidence scoring from live SST gradients + Chlorophyll-a convergence
- West coast / East coast adaptive offset logic
- Species association and depth-based targeting

---

## 🌐 Coastal Port Registry

ORCA maintains a pre-indexed registry of **35+ Indian coastal ports** spanning:
- **Bay of Bengal**: Chennai, Vizag, Paradip, Kolkata, Haldia, Puri, Dhamra, Krishnapatnam, Nagapattinam, Puducherry
- **Arabian Sea**: Mumbai, Kochi, Goa, Mangalore, Veraval, Kandla, Porbandar, Ratnagiri, Karwar
- **Gulf of Mannar**: Tuticorin, Rameshwaram
- **Island Territories**: Port Blair (Andaman), Kavaratti (Lakshadweep)
- **Ecological Zones**: Sundarbans, Gahirmatha Marine Sanctuary, Gulf of Mannar Biosphere

Natural language queries mentioning any of these locations are automatically geocoded to precise coordinates.

---

## 🛡️ Resilience & Graceful Degradation

| Component | Online Mode | Offline/Fallback Mode |
|---|---|---|
| **Planning Agent** | Claude 3.5 Sonnet JSON parsing | Deterministic keyword intent classifier |
| **Response Synthesis** | Claude grounded synthesis | Structured markdown report builder |
| **Database** | Supabase Cloud PostGIS | In-memory spatial index engine |
| **Data Connectors** | Live API calls | Pre-seeded JSON datasets |

ORCA is designed so that **every component has a zero-dependency fallback**, ensuring the system operates fully even without API keys, internet connectivity, or cloud database credentials.

---

## 📊 Performance Characteristics

| Metric | Typical Value |
|---|---|
| Full pipeline execution (8 agents) | 800–2500 ms |
| Planning Agent (LLM mode) | 400–800 ms |
| Planning Agent (deterministic mode) | < 5 ms |
| Data retrieval (3 connectors) | 200–600 ms |
| Risk engine evaluation | < 2 ms |
| Route calculation (2 routes) | < 10 ms |
| PFZ generation (3 zones) | 50–200 ms |
| Spatial index queries | < 5 ms |

---

*ORCA BRAIN v1.0 — Built for SIH 2026 (Problem ID: SIH26176)*
