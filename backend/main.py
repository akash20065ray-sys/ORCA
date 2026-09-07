import os
import sys
import asyncio
from contextlib import asynccontextmanager

if sys.platform == "win32":
    # Prevent Windows IOCP Proactor WinError 64 crash when clients disconnect abruptly
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import settings
from backend.utils.logger import logger
from backend.api import chat, map, routes, pfz, health, emergency, weather, alerts, safety

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("================================================================")
    logger.info(f" 🐋 {settings.PROJECT_NAME} initialized successfully!")
    logger.info(f" 🌐 Server running at: http://{settings.HOST}:{settings.PORT}")
    logger.info("================================================================")
    yield
    logger.info(f" 🛑 {settings.PROJECT_NAME} shut down gracefully.")

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Agentic AI Marine Decision-Support Platform with 8 Collaborative Specialized Agents",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(chat.router)
app.include_router(map.router)
app.include_router(routes.router)
app.include_router(routes.router, prefix="/api/route")
app.include_router(pfz.router)
app.include_router(health.router)
app.include_router(emergency.router)
app.include_router(weather.router)
app.include_router(alerts.router)
app.include_router(safety.router)

# Mount Frontend Static & Vite Production Directories
base_frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
dist_dir = os.path.join(base_frontend_dir, "dist")
dist_assets_dir = os.path.join(dist_dir, "assets")
os.makedirs(dist_assets_dir, exist_ok=True)

app.mount("/assets", StaticFiles(directory=dist_assets_dir), name="dist-assets")

if os.path.exists(base_frontend_dir):
    app.mount("/static", StaticFiles(directory=base_frontend_dir), name="static")

@app.get("/favicon.svg")
async def serve_favicon():
    dist_fav = os.path.join(dist_dir, "favicon.svg")
    if os.path.exists(dist_fav):
        return FileResponse(dist_fav, media_type="image/svg+xml")
    base_fav = os.path.join(base_frontend_dir, "favicon.svg")
    if os.path.exists(base_fav):
        return FileResponse(base_fav, media_type="image/svg+xml")
    return FileResponse(os.path.join(dist_dir, "index.html"))

@app.get("/icons.svg")
async def serve_icons():
    dist_icons = os.path.join(dist_dir, "icons.svg")
    if os.path.exists(dist_icons):
        return FileResponse(dist_icons, media_type="image/svg+xml")
    base_icons = os.path.join(base_frontend_dir, "icons.svg")
    if os.path.exists(base_icons):
        return FileResponse(base_icons, media_type="image/svg+xml")
    return FileResponse(os.path.join(dist_dir, "index.html"))

@app.get("/manifest.webmanifest")
@app.get("/manifest.json")
async def serve_manifest():
    dist_manifest = os.path.join(dist_dir, "manifest.webmanifest")
    if os.path.exists(dist_manifest):
        return FileResponse(dist_manifest, media_type="application/manifest+json")
    base_manifest = os.path.join(base_frontend_dir, "manifest.webmanifest")
    if os.path.exists(base_manifest):
        return FileResponse(base_manifest, media_type="application/manifest+json")
    react_public_manifest = os.path.join(os.path.dirname(base_frontend_dir), "frontend-react", "public", "manifest.webmanifest")
    if os.path.exists(react_public_manifest):
        return FileResponse(react_public_manifest, media_type="application/manifest+json")
    return {"name": "ORCA Marine", "short_name": "ORCA"}

@app.get("/sw.js")
async def serve_service_worker():
    headers = {"Service-Worker-Allowed": "/", "Cache-Control": "no-cache"}
    dist_sw = os.path.join(dist_dir, "sw.js")
    if os.path.exists(dist_sw):
        return FileResponse(dist_sw, media_type="application/javascript", headers=headers)
    base_sw = os.path.join(base_frontend_dir, "sw.js")
    if os.path.exists(base_sw):
        return FileResponse(base_sw, media_type="application/javascript", headers=headers)
    react_public_sw = os.path.join(os.path.dirname(base_frontend_dir), "frontend-react", "public", "sw.js")
    if os.path.exists(react_public_sw):
        return FileResponse(react_public_sw, media_type="application/javascript", headers=headers)
    return FileResponse(os.path.join(dist_dir, "index.html"))

@app.get("/")
async def serve_frontend_root():
    dist_index = os.path.join(dist_dir, "index.html")
    if os.path.exists(dist_index):
        return FileResponse(dist_index)
    index_path = os.path.join(base_frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": f"{settings.PROJECT_NAME} is active. Visit /docs for OpenAPI specifications."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
