# 🚀 ORCA — Deployment Guide

> **ORCA** — Marine EcOsystem Reasoning with Collaborative Agents  
> **SIH 2026** | Problem Statement ID: `SIH26176`

---

## Deployment Options

| Method | Best For | Complexity |
|---|---|---|
| **Local Development** | Development, testing, SIH demo | ⭐ Easy |
| **Docker** | Consistent deployments, CI/CD | ⭐⭐ Medium |
| **Cloud VM** | Production hosting | ⭐⭐⭐ Advanced |

---

## 1. Local Development

### Prerequisites
- Python 3.13+
- pip

### Steps

```bash
# 1. Clone and enter directory
git clone https://github.com/your-org/ORCA_FINAL.git
cd ORCA_FINAL

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment (optional)
cp .env.example .env
# Edit .env to add ANTHROPIC_API_KEY if available

# 4. Start the server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open: **http://127.0.0.1:8000**

### Verify Installation

```bash
# Check health endpoint
curl http://127.0.0.1:8000/api/health

# Run test suite
python -m pytest tests/ -v
```

---

## 2. Docker Deployment

### Using Dockerfile

```bash
# Build the image
docker build -t orca-marine-ai .

# Run the container
docker run -p 8000:8000 --env-file .env orca-marine-ai
```

### Using Docker Compose

```bash
docker-compose up --build
```

### Dockerfile Reference

```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 3. Cloud Deployment

### AWS EC2 / Azure VM / GCP Compute Engine

```bash
# 1. SSH into your VM
ssh user@your-server-ip

# 2. Install Python 3.13
sudo apt update && sudo apt install python3.13 python3.13-venv

# 3. Clone and setup
git clone https://github.com/your-org/ORCA_FINAL.git
cd ORCA_FINAL
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Configure production environment
cp .env.example .env
# Set ENVIRONMENT=production, DEBUG=False, HOST=0.0.0.0

# 5. Run with gunicorn for production
pip install gunicorn
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Recommended Production Settings

```env
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000
DEBUG=False
CACHE_TTL_SECONDS=3600
```

---

## Environment Configuration

### Required for Full Capability (Optional)

| Variable | Service | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic | Claude 3.5 Sonnet for NLU + synthesis |
| `SUPABASE_URL` | Supabase | Cloud PostGIS database URL |
| `SUPABASE_KEY` | Supabase | Service role or anon key |

> **Important**: ORCA operates at full capability **without any API keys** using built-in deterministic engines. API keys enhance natural language understanding and cloud storage but are not required.

---

## Health Monitoring

### Health Check Endpoint

```bash
curl http://your-server:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "system": "ORCA — Agentic AI for Ocean Intelligence",
  "version": "1.0.0",
  "components": {
    "orchestrator": "active (8 specialized agents)",
    "llm_engine": "...",
    "database_gis": "...",
    "connectors": { "...": "operational" },
    "engines": { "...": "active" }
  }
}
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|---|---|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` |
| Port 8000 already in use | Change `PORT` in `.env` or use `--port 8001` |
| `ImportError: anthropic` | Install with `pip install anthropic` (optional) |
| CORS errors in browser | Verify CORS middleware is configured in `main.py` |
| Slow first response | First request warms up data connectors; subsequent requests are cached |

### Logs

The server outputs structured logs with the `[ORCA]` prefix:
```
2026-09-05 19:19:39 [INFO] [ORCA]  🐋 ORCA initialized successfully!
2026-09-05 19:19:39 [INFO] [ORCA]  🌐 Server running at: http://127.0.0.1:8000
```

---

## Performance Tuning

### Caching

Adjust `CACHE_TTL_SECONDS` in `.env`:
- Development: `1800` (30 minutes)
- Production: `3600` (1 hour)

### Workers

For production, use multiple workers:
```bash
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

Recommended workers = `2 × CPU cores + 1`.

---

*ORCA Deployment Guide v1.0 — SIH 2026 (Problem ID: SIH26176)*
