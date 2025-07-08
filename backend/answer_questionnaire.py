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
from generate import generate_answer
from parser import parse_file
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

        # Parse to questions (chunks)
        chunks: List[Document] = parse_file(temp_path)
        if not chunks:
            raise HTTPException(status_code=400, detail="File content could not be extracted.")

        results = []
        for i, chunk in enumerate(chunks):
            question = chunk.page_content.strip()
            if not question:
                continue
            try:
                answer_data = generate_answer(question)
                results.append({
                    "question": question,
                    "answer": answer_data.get("answer", ""),
                    "sources": answer_data.get("sources", [])
                })
            except Exception as e:
                logging.error(f"Q{i} failed: {e}")
                results.append({
                    "question": question,
                    "answer": f"Error generating answer: {str(e)}",
                    "sources": []
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
