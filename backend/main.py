"""
main.py (Refactored)
---------------------
FastAPI application entry point for RAG system.
Includes core routing, shared request types, and modular router loading.
Future-ready for auth middleware, logging, and Microsoft integrations.
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from generate import generate_answer
from sync_knowledge import sync_knowledge
from answer_questionnaire import router as answer_router
from questionnaire_history import router as questionnaire_router
from embedding import get_sync_stats_live
from chat_history import (
    router as chat_router,
    get_chat_history,
    save_message,
    list_sessions
)
from db import init_db

load_dotenv()

# --- App Instance ---
app = FastAPI(title="RAG Agent", version="1.0.0")

# --- CORS (allow local + deployed frontend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://f24questionnaire.vercel.app",
        "https://f24questionnaire-git-main-ducs-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- On Startup ---
@app.on_event("startup")
def on_startup():
    init_db()
    os.makedirs("temp_uploads", exist_ok=True)  # ensure temp dir exists

# --- Routers ---
app.include_router(chat_router)
app.include_router(answer_router)
app.include_router(questionnaire_router)

# --- Shared Model ---
class QuestionRequest(BaseModel):
    question: str
    mode: str = "F24 QA Expert"

# --- Health Check ---
@app.get("/")
def root():
    return {"message": "RAG Agent is running!"}

# --- Single QA ---
@app.post("/generate")
def generate(req: QuestionRequest):
    try:
        result = generate_answer(req.question, req.mode)
        return {
            "question": req.question,
            "answer": result.get("answer", ""),
            "sources": result.get("sources", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

# --- Sync Trigger ---
@app.post("/sync-knowledge")
def sync_knowledge_endpoint():
    try:
        return sync_knowledge()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

# --- Chat API ---
@app.post("/chat/{session_id}/message")
def chat_message(session_id: str, req: QuestionRequest):
    history = get_chat_history(session_id)
    # Save message if it's new
    if not history or history[-1]["role"] != "user" or history[-1]["content"] != req.question:
        save_message(session_id, "user", req.question)

    result = generate_answer(req.question, req.mode)
    answer = result.get("answer", "")
    save_message(session_id, "assistant", answer)

    return {
        "question": req.question,
        "answer": answer,
        "sources": result.get("sources", [])
    }

@app.get("/chat/{session_id}")
def get_full_chat(session_id: str):
    return {"history": get_chat_history(session_id)}

@app.get("/chat")
def get_all_chat_sessions():
    return {"sessions": list_sessions()}

@app.get("/sync-stats")
def sync_stats():
    try:
        return get_sync_stats_live()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


# --- PLACEHOLDERS ---
# Future: /auth/login, /admin/stats, user access logging, file tagging
