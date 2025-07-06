import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

from generate import generate_answer
from sync_knowledge import sync_knowledge
from answer_questionnaire import router as answer_router
from questionnaire_history import router as questionnaire_router
from chat_history import (
    router as chat_router,
    get_chat_history,
    save_message,
    list_sessions
)
from .db import init_db

load_dotenv()

app = FastAPI(title="RAG Agent", version="1.0.0")

# CORS config (for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# Register routers
app.include_router(chat_router)
app.include_router(answer_router)
app.include_router(questionnaire_router)

# Ensure upload directory exists
UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def root():
    return {"message": "RAG Agent is running!"}

# -------------------------
# SHARED REQUEST STRUCTURE
# -------------------------
class QuestionRequest(BaseModel):
    question: str
    mode: str = "F24 QA Expert"

# -------------------------
# GENERATION (single)
# -------------------------
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

# -------------------------
# SYNC ENDPOINT
# -------------------------
@app.post("/sync-knowledge")
def sync_knowledge_endpoint():
    try:
        result = sync_knowledge()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

# -------------------------
# CHAT CONTINUATION ENDPOINTS
# -------------------------
@app.post("/chat/{session_id}/message")
def chat_message(session_id: str, req: QuestionRequest):
    # 💡 Only save user message if this is not the first one
    history = get_chat_history(session_id)
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
