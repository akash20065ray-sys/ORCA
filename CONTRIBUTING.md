# 🤝 ORCA — Contributing Guide

> **ORCA** — Marine EcOsystem Reasoning with Collaborative Agents  
> **SIH 2026** | Problem Statement ID: `SIH26176`

---

## Getting Started

### Prerequisites

- **Python 3.13+** (verify: `python --version`)
- **pip** package manager
- **Git** for version control

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/your-org/ORCA_FINAL.git
cd ORCA_FINAL

# Install dependencies
pip install -r requirements.txt

# Configure environment (optional — ORCA works without any keys)
cp .env.example .env

# Run the server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open **http://127.0.0.1:8000** in your browser.

### Running Tests

```bash
# Run the full test suite
python -m pytest tests/ -v

# Run specific test files
python -m pytest tests/test_risk_engine.py -v
python -m pytest tests/test_sih_scenarios.py -v
```

---

## Project Structure Overview

| Directory | Purpose |
|---|---|
| `backend/agents/` | The 8 specialized domain agents |
| `backend/api/` | FastAPI router endpoints |
| `backend/data_connectors/` | External data feed integrations |
| `backend/services/` | Deterministic scientific engines |
| `backend/database/` | Pydantic models, spatial index, Supabase client |
| `backend/utils/` | LLM client, geo toolkit, logger |
| `frontend/` | HTML5/CSS/JS interactive interface |
| `data/` | Static reference datasets (GeoJSON, JSON) |
| `tests/` | Automated test suite |

---

## Code Architecture Principles

### 1. Zero-Hallucination Guarantee

The LLM (Claude 3.5 Sonnet) is used **only** for:
- Understanding user intent (Planning Agent)
- Synthesizing human-readable reports from structured data (Response Synthesis Agent)

The LLM **never** generates:
- Coordinates, measurements, wind speeds, wave heights
- Risk scores or safety verdicts
- Route geometries or distances
- Any scientific or oceanographic data

All data comes from **deterministic engines** and **verified data connectors**.

### 2. Graceful Degradation

Every component must have a fallback:
- LLM → Deterministic heuristic engine
- Supabase → In-memory spatial index
- Live API → Pre-seeded JSON datasets

### 3. Data Provenance

Every response must include evidence citations with:
- Source name and dataset identifier
- Observation timestamp
- Retrieval latency
- Data freshness status
- Quality flag

---

## How to Add a New Agent

1. Create a new file in `backend/agents/`:
   ```python
   # backend/agents/my_new_agent.py
   import time
   from typing import Dict, Any
   from backend.utils.logger import logger
   
   class MyNewAgent:
       def __init__(self):
           self.name = "my_new_agent"
           self.title = "My New Agent"
       
       def execute(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
           start_time = time.time()
           logger.info(f"[{self.title}] Processing...")
           
           # Your agent logic here
           result = {"key": "value"}
           
           duration_ms = round((time.time() - start_time) * 1000, 2)
           return {
               "agent": self.name,
               "status": "completed",
               "duration_ms": duration_ms,
               "summary": "Agent completed successfully.",
               **result
           }
   
   my_new_agent = MyNewAgent()
   ```

2. Register in `backend/orchestration/orca_orchestrator.py`:
   ```python
   from backend.agents.my_new_agent import my_new_agent
   # Add to agents_map in __init__
   ```

3. Update `backend/utils/llm_client.py` to include the agent in the deterministic intent classifier.

4. Add tests in `tests/`.

---

## How to Add a New Data Connector

1. Create a new file in `backend/data_connectors/`:
   ```python
   # backend/data_connectors/my_connector.py
   import httpx
   from backend.data_connectors.base import BaseConnector
   from backend.utils.logger import logger
   
   class MyConnector(BaseConnector):
       def __init__(self):
           self.name = "my_connector"
       
       def fetch_data(self, lat: float, lon: float) -> dict:
           # Fetch from external API or load from data/
           # Always include: source, dataset, timestamp, data_age_hours, freshness
           pass
   
   my_connector = MyConnector()
   ```

2. Use it in the relevant agent's `execute()` method.

3. Add a citation in `response_synthesis_agent.py`.

---

## How to Add a New API Endpoint

1. Create a new file in `backend/api/`:
   ```python
   from fastapi import APIRouter
   
   router = APIRouter(prefix="/api/my-endpoint", tags=["My Feature"])
   
   @router.get("")
   async def my_handler():
       return {"status": "ok"}
   ```

2. Register in `backend/main.py`:
   ```python
   from backend.api import my_endpoint
   app.include_router(my_endpoint.router)
   ```

---

## Coding Standards

- **Type Hints**: Use Python type hints on all function signatures
- **Pydantic Models**: Use Pydantic v2 `BaseModel` for all data structures
- **Logging**: Use `from backend.utils.logger import logger` for all logging
- **Docstrings**: Add descriptive docstrings to all classes and public methods
- **Constants**: Use `UPPER_SNAKE_CASE` for constants
- **File Naming**: Use `snake_case.py` for all Python files

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ❌ | `""` | Anthropic Claude API key |
| `SUPABASE_URL` | ❌ | `""` | Supabase project URL |
| `SUPABASE_KEY` | ❌ | `""` | Supabase anon/service key |
| `DATABASE_URL` | ❌ | `""` | PostgreSQL connection string |
| `ENVIRONMENT` | ❌ | `development` | App environment |
| `HOST` | ❌ | `127.0.0.1` | Server bind address |
| `PORT` | ❌ | `8000` | Server port |
| `DEBUG` | ❌ | `True` | Enable hot-reload |
| `CACHE_TTL_SECONDS` | ❌ | `1800` | Data cache duration |

> **Note**: ORCA is designed to operate with **zero external dependencies**. All environment variables are optional.

---

## Testing Guidelines

- **Unit Tests**: Test individual engines and utilities (`test_risk_engine.py`, `test_route_engine.py`)
- **Integration Tests**: Test data connectors with live/mock APIs (`test_connectors.py`)
- **Scenario Tests**: End-to-end SIH problem statement scenarios (`test_sih_scenarios.py`)
- **Endpoint Tests**: HTTP-level API verification (`verify_endpoints.py`)

All tests should pass with `python -m pytest tests/ -v`.

---

*ORCA Contributing Guide v1.0 — SIH 2026 (Problem ID: SIH26176)*
