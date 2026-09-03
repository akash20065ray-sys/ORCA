from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time
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
