import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from .generate import generate_answer
from .sync_knowledge import sync_knowledge
from .answer_questionnaire import router as answer_router

load_dotenv()

app = FastAPI(title="RAG Agent", version="1.0.0")

# Ensure upload directory exists
UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.include_router(answer_router)

@app.get("/")
def root():
    return {"message": "RAG Agent is running!"}

class QuestionRequest(BaseModel):
    question: str
    mode: str = "F24 QA Expert"

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

@app.post("/sync-knowledge")
def sync_knowledge_endpoint():
    try:
        result = sync_knowledge()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")