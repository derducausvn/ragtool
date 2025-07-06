from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, delete
from .models import ChatSession, ChatMessage
from .db import get_session

router = APIRouter()

@router.post("/chat/save")
def save_chat(payload: dict, session=Depends(get_session)):
    title = payload['messages'][0]['content'][:30]
    new_chat = ChatSession(title=title)
    session.add(new_chat)
    session.commit()
    session.refresh(new_chat)

    for msg in payload['messages']:
        session.add(ChatMessage(session_id=new_chat.id, role=msg['role'], content=msg['content']))
    session.commit()
    return {"success": True, "session_id": new_chat.id}

@router.get("/chat/history")
def chat_history(session=Depends(get_session)):
    sessions = session.exec(select(ChatSession).order_by(ChatSession.created_at.desc())).all()
    return {"history": [{"id": s.id, "title": s.title} for s in sessions]}

def get_chat_history(session_id: int):
    with get_session() as session:
        messages = session.exec(
            select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.timestamp)
        ).all()
        return [{"role": m.role, "content": m.content} for m in messages]

def save_message(session_id: int, role: str, content: str):
    with get_session() as session:
        message = ChatMessage(session_id=session_id, role=role, content=content)
        session.add(message)
        session.commit()

def list_sessions():
    with get_session() as session:
        sessions = session.exec(select(ChatSession).order_by(ChatSession.created_at.desc())).all()
        return [{"id": s.id, "title": s.title} for s in sessions]

@router.post("/chat/{session_id}/rename")
def rename_chat(session_id: int, new_title: str, session=Depends(get_session)):
    chat = session.get(ChatSession, session_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    chat.title = new_title
    session.add(chat)
    session.commit()
    return {"success": True}

@router.delete("/chat/{session_id}")
def delete_chat(session_id: int, session=Depends(get_session)):
    chat = session.get(ChatSession, session_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # ✅ Delete all associated ChatMessages first
    session.exec(
        delete(ChatMessage).where(ChatMessage.session_id == session_id)
    )

    session.delete(chat)
    session.commit()
    return {"success": True}

@router.post("/chat/new")
def new_chat(payload: dict = {}, session=Depends(get_session)):
    title = payload.get("title", "Untitled Chat")
    chat = ChatSession(title=title)
    session.add(chat)
    session.commit()
    session.refresh(chat)
    return {"session_id": chat.id}


__all__ = ["router", "get_chat_history", "save_message", "list_sessions", "rename_chat", "delete_chat", "new_chat"]
