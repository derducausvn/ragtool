"""
chat_history.py (Refactored)
----------------------------
Handles database interactions and API endpoints for chat sessions and messages.
Supports create, retrieve, rename, and delete. Lightweight design for extensibility.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, delete
from models import ChatSession, ChatMessage
from db import get_session

router = APIRouter()

# --- API: Create new session from full payload ---
@router.post("/chat/save")
def save_chat(payload: dict, session=Depends(get_session)):
    messages = payload.get("messages", [])
    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    title = messages[0]["content"][:30] if messages else "Untitled"
    new_chat = ChatSession(title=title)
    session.add(new_chat)
    session.commit()
    session.refresh(new_chat)

    for msg in messages:
        session.add(ChatMessage(
            session_id=new_chat.id,
            role=msg["role"],
            content=msg["content"]
        ))
    session.commit()

    return {"success": True, "session_id": new_chat.id}

# --- API: Return list of past sessions ---
@router.get("/chat/history")
def chat_history(session=Depends(get_session)):
    sessions = session.exec(select(ChatSession).order_by(ChatSession.created_at.desc())).all()
    return {"history": [{"id": s.id, "title": s.title} for s in sessions]}

# --- API: Create new empty session ---
@router.post("/chat/new")
def new_chat(payload: dict = {}, session=Depends(get_session)):
    title = payload.get("title", "Untitled Chat")
    chat = ChatSession(title=title)
    session.add(chat)
    session.commit()
    session.refresh(chat)
    return {"session_id": chat.id}

# --- API: Rename chat session ---
@router.post("/chat/{session_id}/rename")
def rename_chat(session_id: int, new_title: str, session=Depends(get_session)):
    chat = session.get(ChatSession, session_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    chat.title = new_title
    session.add(chat)
    session.commit()
    return {"success": True}

# --- API: Delete session and messages ---
@router.delete("/chat/{session_id}")
def delete_chat(session_id: int, session=Depends(get_session)):
    chat = session.get(ChatSession, session_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    session.exec(delete(ChatMessage).where(ChatMessage.session_id == session_id))
    session.delete(chat)
    session.commit()
    return {"success": True}

# --- Utility: Get full history for session ---
def get_chat_history(session_id: int):
    with get_session() as session:
        messages = session.exec(
            select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.timestamp)
        ).all()
        return [{"role": m.role, "content": m.content} for m in messages]

# --- Utility: List all chat sessions ---
def list_sessions():
    with get_session() as session:
        sessions = session.exec(select(ChatSession).order_by(ChatSession.created_at.desc())).all()
        return [{"id": s.id, "title": s.title} for s in sessions]

# --- Utility: Save single message ---
def save_message(session_id: int, role: str, content: str):
    session = get_session()
    try:
        msg = ChatMessage(session_id=session_id, role=role, content=content)
        session.add(msg)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# Exported for router inclusion
__all__ = [
    "router", "get_chat_history", "save_message", "list_sessions",
    "rename_chat", "delete_chat", "new_chat"
]

# --- PLACEHOLDER ---
# Future: User-based session filtering, chat tagging, message search