import os
from uuid import uuid4
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from app.generate import generate_answer
from app.sync_knowledge import sync_knowledge
from app.answer_questionnaire import router as answer_router  

load_dotenv()
app = FastAPI()

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Register smart answer upload route
app.include_router(answer_router)

@app.get("/")
def root():
    return {"message": "RAG Agent is running!"}

class QuestionRequest(BaseModel):
    question: str
    mode: str = "F24 QA Expert"
    
@app.post("/generate")
def generate(req: QuestionRequest):
    result = generate_answer(req.question, req.mode)
    
    # Handle both dict (expected) and fallback string (old version)
    if isinstance(result, dict):
        return {
            "question": req.question,
            **result  # expands answer, confidence_score, sources
        }
    else:
        return {
            "question": req.question,
            "answer": result,
            "confidence_score": 0.0,
            "sources": []
        }


@app.post("/sync-knowledge")
def sync_knowledge_endpoint():
    result = sync_knowledge()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
