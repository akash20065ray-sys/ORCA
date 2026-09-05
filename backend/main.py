import os
import sys
import asyncio

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
from backend.api import chat, map, routes, pfz, health

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Agentic AI Marine Decision-Support Platform with 8 Collaborative Specialized Agents (SIH26176)",
    version=settings.VERSION
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

# Mount Frontend Static Directory
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/")
async def serve_frontend_root():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": f"{settings.PROJECT_NAME} is active. Visit /docs for OpenAPI specifications."}

@app.on_event("startup")
async def startup_event():
    logger.info("================================================================")
    logger.info(f" 🐋 {settings.PROJECT_NAME} initialized successfully!")
    logger.info(f" 🏆 SIH Problem Statement ID: {settings.SIH_PROBLEM_ID}")
    logger.info(f" 🌐 Server running at: http://{settings.HOST}:{settings.PORT}")
    logger.info("================================================================")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
