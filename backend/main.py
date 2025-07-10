"""
main.py (OpenAI Assistant Only)
---------------------
FastAPI application entry point for OpenAI Assistant-based RAG system.
"""

import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from answer_questionnaire import router as answer_router
from questionnaire_history import router as questionnaire_router
from chat_history import (
    router as chat_router,
    get_chat_history,
    save_message,
    list_sessions
)
from db import init_db, get_session
from openai_file_upload import router as openai_file_upload_router

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
app.include_router(openai_file_upload_router)

# --- Request Models ---
class AssistantRequest(BaseModel):
    question: str
    session_id: int = None  # Optional session ID for persistence

# --- Health Check ---
@app.get("/")
def root():
    return {"message": "RAG Agent is running!"}

# --- Chat History APIs (for session listing/history UI) ---
@app.get("/chat/{session_id}")
def get_full_chat(session_id: int):
    return {"history": get_chat_history(session_id)}

@app.get("/chat")
def get_all_chat_sessions():
    return {"sessions": list_sessions()}

# --- Assistant API ---
@app.post("/chat/assistant")
def chat_assistant(req: AssistantRequest, session=Depends(get_session)):
    try:
        import logging
        import os
        from openai_integration import query_openai_assistant
        
        ASSISTANT_ID = os.getenv("OPENAI_RAG_ASSISTANT_ID")
        if not ASSISTANT_ID:
            raise HTTPException(status_code=500, detail="Assistant ID not configured")
        
        logging.info(f"Direct assistant call for question: {req.question[:50]}...")
        
        # Call OpenAI assistant directly - no unnecessary layers
        answer = query_openai_assistant(req.question, ASSISTANT_ID)
        
        logging.info(f"Direct answer generated: {answer[:100]}...")
        
        # If session_id is provided, save the conversation to the database
        if req.session_id:
            # Save user message
            save_message(req.session_id, "user", req.question)
            # Save assistant response
            save_message(req.session_id, "assistant", answer)
            
        return {
            "question": req.question,
            "answer": answer,
            "session_id": req.session_id
        }
    except Exception as e:
        logging.error(f"Direct assistant call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Assistant failed: {str(e)}")


# --- PLACEHOLDERS ---
# Future: /auth/login, /admin/stats, user access logging, file tagging
