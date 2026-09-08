# Multi-stage lightweight production Dockerfile for ORCA
FROM python:3.13-slim

WORKDIR /app

# Install OS utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and datasets
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY data/ ./data/
COPY tests/ ./tests/
COPY .env.example .env

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

CMD ["sh", "-c", "python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
