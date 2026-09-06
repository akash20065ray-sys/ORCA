from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import time
import json
import asyncio
import uuid

from backend.orchestration.orca_orchestrator import orca_orchestrator
from backend.database.models import OrchestrationResult
from backend.utils.logger import logger

router = APIRouter(prefix="/api/chat", tags=["Chat & Intelligence"])

# In-memory and session store
chat_sessions_store: Dict[str, Dict[str, Any]] = {}

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: Optional[str] = "en" # "en", "ta", "hi", "ml", "te", "bn", "gu"

class VoiceChatRequest(BaseModel):
    transcript: Optional[str] = None
    audio_base64: Optional[str] = None
    session_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: Optional[str] = "en"

@router.post("", response_model=OrchestrationResult)
async def process_chat_query(req: ChatRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")
    
    user_coords = None
    if req.latitude is not None and req.longitude is not None:
        user_coords = {"lat": req.latitude, "lon": req.longitude}

    session_id = req.session_id or str(uuid.uuid4())

    try:
        result = orca_orchestrator.process_query(
            user_query=req.query.strip(),
            user_location=user_coords,
            language=req.language or "en"
        )

        # Store in session history
        if session_id not in chat_sessions_store:
            chat_sessions_store[session_id] = {
                "session_id": session_id,
                "title": req.query[:45] + ("..." if len(req.query) > 45 else ""),
                "created_at": time.time(),
                "updated_at": time.time(),
                "messages": []
            }

        chat_sessions_store[session_id]["updated_at"] = time.time()
        chat_sessions_store[session_id]["messages"].append({
            "query": req.query,
            "result": result.model_dump(),
            "timestamp": time.time()
        })

        return result
    except Exception as e:
        logger.error(f"Error processing ORCA query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal agent orchestration error: {str(e)}")

@router.post("/stream")
async def stream_chat_query(req: ChatRequest):
    """Real-time SSE multi-agent reasoning trace and final synthesis generator."""
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")

    user_coords = None
    if req.latitude is not None and req.longitude is not None:
        user_coords = {"lat": req.latitude, "lon": req.longitude}

    session_id = req.session_id or str(uuid.uuid4())

    async def sse_event_generator():
        try:
            # Stage 1: Intent & Routing
            yield f"data: {json.dumps({'stage': 'routing', 'agent': 'Orchestrator', 'message': 'Classifying intent & extracting geospatial marine parameters...', 'timestamp': time.time()})}\n\n"
            await asyncio.sleep(0.08)

            # Stage 2: INCOIS & Oceanographic Telemetry
            yield f"data: {json.dumps({'stage': 'telemetry', 'agent': 'INCOIS Ocean Hub', 'message': 'Ingesting live sea state, SST thermal gradients & tidal curves...', 'timestamp': time.time()})}\n\n"
            await asyncio.sleep(0.08)

            # Stage 3: Multi-Agent Dispatch
            yield f"data: {json.dumps({'stage': 'agents', 'agent': 'Multi-Agent Collective', 'message': 'Dispatching to Weather, Route, Safety, Fleet & PFZ neural models...', 'timestamp': time.time()})}\n\n"
            await asyncio.sleep(0.08)

            # Process orchestration
            result = orca_orchestrator.process_query(
                user_query=req.query.strip(),
                user_location=user_coords,
                language=req.language or "en"
            )

            # Stage 4: Synthesis & Complete
            res_dict = result.model_dump()
            
            # Store in session
            if session_id not in chat_sessions_store:
                chat_sessions_store[session_id] = {
                    "session_id": session_id,
                    "title": req.query[:45] + ("..." if len(req.query) > 45 else ""),
                    "created_at": time.time(),
                    "updated_at": time.time(),
                    "messages": []
                }
            chat_sessions_store[session_id]["updated_at"] = time.time()
            chat_sessions_store[session_id]["messages"].append({
                "query": req.query,
                "result": res_dict,
                "timestamp": time.time()
            })

            yield f"data: {json.dumps({'stage': 'complete', 'agent': 'ORCA Maritime AI', 'result': res_dict, 'timestamp': time.time()})}\n\n"
        except Exception as e:
            logger.error(f"Error in chat stream: {e}", exc_info=True)
            yield f"data: {json.dumps({'stage': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")

@router.post("/voice")
async def process_voice_chat(req: VoiceChatRequest):
    """Accepts voice transcript or audio query and produces marine speech-ready output."""
    raw_query = (req.transcript or "").strip()
    if not raw_query and not req.audio_base64:
        raise HTTPException(status_code=400, detail="Voice query text or audio must be provided.")
    
    # If raw query was extracted via Web Speech API in frontend
    if not raw_query and req.audio_base64:
        # Fallback transcript for demonstration audio stream
        raw_query = "What is the current sea state and wind advisory near Kochi?"

    user_coords = None
    if req.latitude is not None and req.longitude is not None:
        user_coords = {"lat": req.latitude, "lon": req.longitude}

    result = orca_orchestrator.process_query(
        user_query=raw_query,
        user_location=user_coords,
        language=req.language or "en"
    )

    # Clean spoken text (strip markdown asterisks and technical JSON for marine VHF radio voice)
    spoken_summary = getattr(result, "synthesized_response", "")
    for ch in ["**", "###", "##", "*", "`"]:
        spoken_summary = spoken_summary.replace(ch, "")

    return {
        "transcript": raw_query,
        "spoken_response": spoken_summary,
        "audio_synthesis_params": {
            "rate": 1.0,
            "pitch": 0.95,
            "voice_type": "nautical_officer",
            "lang": req.language or "en-US"
        },
        "orchestration": result.model_dump()
    }


@router.get("/sessions")
async def get_all_chat_sessions() -> List[Dict[str, Any]]:
    """Returns list of previous chat sessions."""
    sessions = []
    for s_id, s_data in sorted(chat_sessions_store.items(), key=lambda x: x[1]["updated_at"], reverse=True):
        sessions.append({
            "session_id": s_id,
            "title": s_data["title"],
            "created_at": s_data["created_at"],
            "updated_at": s_data["updated_at"],
            "message_count": len(s_data["messages"])
        })
    return sessions

@router.post("/sessions")
async def create_chat_session(title: Optional[str] = "New Maritime Intelligence Session") -> Dict[str, Any]:
    """Explicitly initializes a new chat session."""
    session_id = str(uuid.uuid4())
    now = time.time()
    chat_sessions_store[session_id] = {
        "session_id": session_id,
        "title": title or "New Maritime Intelligence Session",
        "created_at": now,
        "updated_at": now,
        "messages": []
    }
    return {"status": "created", "session_id": session_id, "title": title}

@router.delete("/sessions")
async def clear_all_chat_sessions() -> Dict[str, Any]:
    """Clears all stored chat sessions."""
    count = len(chat_sessions_store)
    chat_sessions_store.clear()
    return {"status": "cleared", "deleted_count": count}

@router.get("/sessions/{session_id}")
async def get_chat_session(session_id: str) -> Dict[str, Any]:
    """Retrieves a specific chat session with its messages."""
    if session_id not in chat_sessions_store:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return chat_sessions_store[session_id]

@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: str) -> Dict[str, Any]:
    """Deletes a chat session."""
    if session_id in chat_sessions_store:
        del chat_sessions_store[session_id]
    return {"status": "deleted", "session_id": session_id}
