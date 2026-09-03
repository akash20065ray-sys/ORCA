# ORCA — Agentic AI for Ocean Intelligence
**Marine EcOsystem Reasoning with Collaborative Agents**  
**Smart India Hackathon (SIH) Problem Statement ID:** `SIH26176`

---

## 🌊 Overview

**ORCA** is a state-of-the-art conversational marine intelligence and decision-support system. It empowers vessel masters, artisanal fishermen, coastal communities, and maritime authorities to query complex oceanographic, meteorological, hazard, routing, and fishing information in natural language.

Unlike simple chatbots, ORCA operates on an **agentic architecture**:
```
User Query + Location 
  ↓
FastAPI Orchestration Gateway
  ↓
Planning Agent (LLM Intent Decomposition & Agent Selection)
  ↓
8 Specialized Domain Agents
  ↓
Real-Time Data Connectors (Open-Meteo, NOAA CoastWatch, Copernicus, INCOIS, IMD)
  ↓
Normalization, Validation & Freshness Engine
  ↓
Deterministic Scientific Engines (Risk Assessment, Navigable Routing, PFZ Intelligence)
  ↓
PostGIS / Supabase Spatial Database
  ↓
Response Synthesis Agent (Grounded Explanation + Complete Data Provenance Citations)
  ↓
Interactive Marine-Tech Interface (Chat HUD + Leaflet Ocean Map + Telemetry Charts + Multilingual Voice)
```

> [!IMPORTANT]
> **Communication & Grounding Principle**: The Planning Agent uses an LLM to understand the user's request, decompose the task, and coordinate the required specialized agents. The LLM never invents or fabricates ocean measurements, coordinates, wind speeds, wave heights, route geometries, or hazard levels. All domain calculations and safety evaluations are performed deterministically by specialized agents and scientific engines.

---

## 🤖 The 8 Specialized Agents

| # | Agent Name | Role & Responsibilities | Grounded Tools & APIs |
|---|---|---|---|
| 1 | **Planning Agent** | LLM-powered orchestrator. Decomposes natural language queries, extracts intent/timeframe/coordinates, selects specialized agents. | LLM Structured JSON Parser, Coastal Geocoder |
| 2 | **Marine Data Retrieval Agent** | Coordinates multi-source ingestion across ocean, weather, and satellite feeds. | Open-Meteo Marine, NOAA CoastWatch, INCOIS Buoys |
| 3 | **Ocean Analytics Agent** | Analyzes Sea Surface Temperature (SST), Chlorophyll-a, thermal gradients ($\Delta T/\text{km}$), and thermocline upwelling. | Thermal Gradient Edge Detector, Chlorophyll Front Analyzer |
| 4 | **Weather Intelligence Agent** | Evaluates wind vectors, gusts, Douglas Sea State, Beaufort wind force, wave heights, swell period, and barometric pressure. | Open-Meteo Marine & Atmospheric Service |
| 5 | **Alert & Notification Agent** | Aggregates government bulletins, High Wave Alerts, rough sea warnings, and port danger signals (Signals 1–11). | INCOIS Ocean State Forecast, IMD Marine Weather |
| 6 | **Risk Assessment Agent** | Evaluates multi-factor deterministic safety score (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`) with explicit causal factors. | Deterministic Safety Matrix Engine, Douglas/Beaufort Index |
| 7 | **Geospatial Analysis Agent** | Performs PostGIS spatial queries, geofencing, Marine Protected Area (MPA) intersections, and obstacle-avoiding sea routing. | PostGIS Spatial Index, Geodesic Distance Engine, Navigable Waypoint Router |
| 8 | **Response Synthesis Agent** | Combines structured findings into an actionable report with complete Data Provenance and source latency citations. | LLM Synthesis with Strict Grounding, Source Citation Formatter |

---

## 🛠️ Technology Stack

- **Backend**: Python 3.13, FastAPI, Uvicorn, Pydantic v2
- **AI & Reasoning**: Anthropic Claude 3.5 Sonnet / Grounded Deterministic Heuristic Engine
- **Spatial & Database**: Supabase (PostgreSQL + PostGIS) with built-in embedded spatial indexing engine
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript, Leaflet.js, Web Speech API
- **Data Feeds**:
  - Open-Meteo Marine & Atmospheric Live APIs
  - NOAA CoastWatch GHRSST (Level 4 SST)
  - Copernicus Marine / MODIS-Aqua (Chlorophyll-a)
  - INCOIS & IMD Marine Warning Bulletins
  - National Data Buoy Programme (OMNI Deep Sea & Coastal Wave Rider buoys)
  - National Marine Protected Area (MPA) and Indian EEZ GIS boundaries

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/your-org/ORCA_FINAL.git
cd ORCA_FINAL
pip install -r requirements.txt
```

### 2. Environment Configuration (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(If left empty, ORCA automatically operates using high-precision grounded local heuristics and embedded PostGIS spatial indexing with zero external blockers!)*

### 3. Running the Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Open your browser and navigate to: **`http://127.0.0.1:8000`**

### 4. Running the Automated Test Suite
```bash
python -m pytest tests/ -v
```

---

## 📡 API Endpoints

- `POST /api/chat`: Orchestrates natural language decision queries across the 8 specialized agents.
- `GET /api/map/layers`: Returns GIS boundaries (MPAs, EEZ), SST grid heatmap, active hazard alerts, ports, and buoys.
- `POST /api/routes/analyze`: Calculates and compares Route Alpha (direct) vs Route Bravo (deep-water & MPA bypass).
- `GET /api/pfz/zones`: Returns INCOIS-calibrated Potential Fishing Zones for any coastal area.
- `GET /api/health`: Provides system health and telemetry connector status.
