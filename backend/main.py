import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from .generate import generate_answer
from .sync_knowledge import sync_knowledge
from .answer_questionnaire import router as answer_router

# Load local .env variables (only used locally)
load_dotenv()

app = FastAPI()

# Ensure upload directory exists
UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Register questionnaire answer routes (e.g., /answer-questionnaire)
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
    # Handle expected dict or fallback string response
    if isinstance(result, dict):
        return {
            "question": req.question,
            **result  # Unpack answer, confidence_score, sources
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
        # Return HTTP 400 if syncing failed with error message
        raise HTTPException(status_code=400, detail=result["error"])
    return result
