from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from models import QuestionnaireSession
from db import get_session
import json

router = APIRouter()

@router.post("/questionnaire/save")
def save_questionnaire(payload: dict, session=Depends(get_session)):
    session_id = save_questionnaire_entry(
        title=payload.get("title", "Untitled Questionnaire"),
        file_name=payload.get("file_name", ""),
        results=payload.get("results", []),
        session=session
    )
    return {"success": True, "session_id": session_id}

@router.get("/questionnaire/history")
def get_questionnaire_history(session=Depends(get_session)):
    entries = session.exec(select(QuestionnaireSession).order_by(QuestionnaireSession.created_at.desc())).all()
    return {"history": [{"id": q.id, "title": q.title, "file_name": q.file_name} for q in entries]}

@router.get("/questionnaire/{session_id}")
def get_questionnaire_session(session_id: int, session=Depends(get_session)):
    entry = session.get(QuestionnaireSession, session_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "title": entry.title,
        "file_name": entry.file_name,
        "results": json.loads(entry.results_json)
    }

@router.post("/questionnaire/{session_id}/rename")
def rename_questionnaire(session_id: int, new_title: str, session=Depends(get_session)):
    entry = session.get(QuestionnaireSession, session_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    entry.title = new_title
    session.add(entry)
    session.commit()
    return {"success": True}

@router.delete("/questionnaire/{session_id}")
def delete_questionnaire(session_id: int, session=Depends(get_session)):
    entry = session.get(QuestionnaireSession, session_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(entry)
    session.commit()
    return {"success": True}

def save_questionnaire_entry(title: str, file_name: str, results: list, session):
    new_q = QuestionnaireSession(
        title=title,
        file_name=file_name,
        results_json=json.dumps(results)
    )
    session.add(new_q)
    session.commit()
    session.refresh(new_q)
    return new_q.id

__all__ = ["router", "save_questionnaire", "save_questionnaire_entry", "delete_questionnaire", "rename_questionnaire", "get_questionnaire_session", "get_questionnaire_history"]