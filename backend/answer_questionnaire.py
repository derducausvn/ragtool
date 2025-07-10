"""
answer_questionnaire.py (Refactored)
------------------------------------
Handles file upload of questionnaires, parses questions, and returns generated answers.
Supports Excel and unstructured formats. Saves session with Q&A results.
Future-ready for user-level logging and extended analytics.
"""

import os
import tempfile
import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from langchain.schema import Document
from generate import generate_answer_with_assistant
from questionnaire_parser import parse_questionnaire_file
from questionnaire_history import save_questionnaire_entry
from db import engine
from sqlmodel import Session

router = APIRouter()

SUPPORTED_FORMATS = {"xlsx", "pdf", "docx"}

@router.post("/answer-questionnaire")
async def answer_questionnaire(file: UploadFile = File(...)):
    """
    Accepts a file upload (Q&A Excel or document), extracts questions,
    and returns generated answers. Saves to DB for retrieval later.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.split(".")[-1].lower()
    if ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Supported: {', '.join(SUPPORTED_FORMATS)}"
        )

    temp_path = None
    try:
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        # --- LLM-powered question extraction ---
        # Uses OpenAI Assistant (asst_LHcHlznpeN50voRNxJA8FgZV) for robust, multilingual question extraction from any supported file type.
        # Returns a list of langchain.schema.Document objects, each representing a question.
        chunks: List[Document] = parse_questionnaire_file(temp_path)
        if not chunks:
            logging.warning(f"No questions extracted from file: {file.filename}")
            raise HTTPException(status_code=400, detail="No questions could be extracted from the uploaded file. Please check the file format and content.")

        # --- LLM-powered answer generation (batch) ---
        # Collect all non-empty questions
        questions = [chunk.page_content.strip() for chunk in chunks if chunk.page_content.strip()]
        if not questions:
            logging.warning(f"No valid questions found in file: {file.filename}")
            raise HTTPException(status_code=400, detail="No valid questions found in the uploaded file.")

        # Generate answers in a single batch call
        answers = generate_answer_with_assistant(questions)
        results = []
        for q, a in zip(questions, answers):
            results.append({
                "question": q,
                "answer": a
            })

        logging.info(f"Processed {len(results)} questions from upload: {file.filename}")

        # Persist to DB
        with Session(engine) as session:
            session_id = save_questionnaire_entry(
                title=file.filename[:30],
                file_name=file.filename,
                results=results,
                session=session
            )

        return JSONResponse(content={
            "questions_and_answers": results,
            "session_id": session_id
        })

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"File processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logging.warning(f"Failed to clean temp file: {e}")

# --- PLACEHOLDER ---
# Future: user_id logging, format-specific metrics, parallel processing
