"""
main.py - Clean URL Routing Structure
---------------------
FastAPI application with organized routing for Chat, Questionnaires, and Knowledge Base
"""

import os
import logging
import openai
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
app = FastAPI(
    title="RAG Agent API", 
    version="1.0.0",
    description="API for Chat, Questionnaires, and Knowledge Base Management"
)

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",                              # Local development
        "http://127.0.0.1:3000",                             # Local development alt
        "https://f24questionnaire.vercel.app",               # Vercel production
        "https://f24questionnaire-git-main-ducs-projects.vercel.app",  # Vercel preview
        "https://ragtool-frontend.onrender.com",             # Render frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Startup ---
@app.on_event("startup")
def on_startup():
    init_db()
    os.makedirs("temp_uploads", exist_ok=True)

# --- Mount Routers with Clean URL Structure ---
app.include_router(chat_router, prefix="/chat", tags=["Chat & Ask"])
app.include_router(answer_router, prefix="/questionnaires", tags=["Questionnaires"])
app.include_router(questionnaire_router, prefix="/questionnaires", tags=["Questionnaires"])
app.include_router(openai_file_upload_router, prefix="/knowledge", tags=["Knowledge Base"])

# --- Request Models ---
class AssistantRequest(BaseModel):
    question: str
    session_id: int = None

# --- Root Health Check ---
@app.get("/", tags=["Health"])
def root():
    return {"message": "RAG Agent API is running!", "version": "1.0.0"}

# --- API Information ---
@app.get("/api/info", tags=["Health"])
def api_info():
    return {
        "title": "RAG Agent API",
        "version": "1.0.0",
        "main_functions": {
            "chat_and_ask": "/chat/",
            "questionnaires": "/questionnaires/",
            "knowledge_base": "/knowledge/"
        },
        "endpoints": {
            "chat": {
                "assistant_chat": "/chat/assistant",
                "general_chat": "/chat/general", 
                "chat_history": "/chat/{session_id}",
                "all_sessions": "/chat/history"
            },
            "questionnaires": {
                "process": "/questionnaires/process",
                "history": "/questionnaires/history",
                "session": "/questionnaires/{session_id}",
                "rename": "/questionnaires/{session_id}/rename",
                "delete": "/questionnaires/{session_id}"
            },
            "knowledge_base": {
                "files": "/knowledge/files",
                "upload": "/knowledge/upload",
                "scan_website": "/knowledge/scan-website",
                "delete": "/knowledge/files/{file_id}"
            }
        }
    }

# --- Direct Chat Endpoints (keeping compatibility) ---
@app.post("/chat/assistant", tags=["Chat & Ask"])
def chat_assistant(req: AssistantRequest, session=Depends(get_session)):
    """F24 QA Expert - Chat with knowledge base"""
    try:
        from openai_integration import query_openai_assistant
        
        ASSISTANT_ID = os.getenv("OPENAI_RAG_ASSISTANT_ID")
        if not ASSISTANT_ID:
            raise HTTPException(status_code=500, detail="Assistant ID not configured")
        
        logging.info(f"Assistant chat: {req.question[:50]}...")
        
        # Call OpenAI assistant with knowledge base
        answer = query_openai_assistant(req.question, ASSISTANT_ID)
        
        logging.info(f"Assistant answer generated: {answer[:100]}...")
        
        # Save to database if session provided
        if req.session_id:
            save_message(req.session_id, "user", req.question)
            save_message(req.session_id, "assistant", answer)
            
        return {
            "question": req.question,
            "answer": answer,
            "session_id": req.session_id,
            "mode": "expert"
        }
    except Exception as e:
        logging.error(f"Assistant chat failed: {e}")
        raise HTTPException(status_code=500, detail=f"Assistant failed: {str(e)}")

@app.post("/chat/general", tags=["Chat & Ask"])
def chat_general(req: AssistantRequest, session=Depends(get_session)):
    """General Chat - Direct GPT without knowledge base"""
    try:
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        logging.info(f"General chat: {req.question[:50]}...")
        
        # Direct GPT call without knowledge base
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant. Provide clear, accurate, and helpful responses."},
                {"role": "user", "content": req.question}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        answer = response.choices[0].message.content.strip()
        
        logging.info(f"General chat answer: {answer[:100]}...")
        
        # Save to database if session provided
        if req.session_id:
            save_message(req.session_id, "user", req.question)
            save_message(req.session_id, "assistant", answer)
            
        return {
            "question": req.question,
            "answer": answer,
            "session_id": req.session_id,
            "mode": "general",
            "sources": []
        }
    except Exception as e:
        logging.error(f"General chat failed: {e}")
        raise HTTPException(status_code=500, detail=f"General chat failed: {str(e)}")