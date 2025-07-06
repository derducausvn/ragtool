import os
import tempfile
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from langchain.schema import Document
import logging

from generate import generate_answer
from parser import parse_file
from questionnaire_history import save_questionnaire_entry
from db import engine
from sqlmodel import Session

router = APIRouter()

SUPPORTED_FORMATS = {"xlsx", "pdf", "docx"}

@router.post("/answer-questionnaire")
async def answer_questionnaire(file: UploadFile = File(...)):
    """Process uploaded questionnaire file and generate answers"""
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file format
    file_ext = file.filename.split(".")[-1].lower()
    if file_ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
        )

    temp_path = None
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        # Parse document into chunks
        chunks: List[Document] = parse_file(temp_path)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="No content could be extracted from the file")

        # Process each chunk as a question
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
                logging.error(f"Error processing question {i}: {e}")
                results.append({
                    "question": question,
                    "answer": f"Error processing question: {str(e)}",
                    "sources": []
                })

        logging.info(f"Processed {len(results)} questions from questionnaire")
        session = Session(engine)
        try:
            session_id = save_questionnaire_entry(
                title=file.filename[:30],
                file_name=file.filename,
                results=results,
                session=session
            )
        finally:
            session.close()

        return JSONResponse(content={
            "questions_and_answers": results,
            "session_id": session_id  # after saving entry
        })

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error processing questionnaire: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process questionnaire: {str(e)}")
    
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logging.warning(f"Failed to clean up temp file: {e}")