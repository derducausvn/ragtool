import os
import tempfile
import pandas as pd
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from langchain.schema import Document
from generate import generate_answer
from parser import parse_file

router = APIRouter()

@router.post("/answer-questionnaire")
async def answer_questionnaire(file: UploadFile = File(...)):
    try:
        file_ext = file.filename.split(".")[-1].lower()
        if file_ext not in ["xlsx", "pdf", "docx"]:
            raise HTTPException(status_code=400, detail="Only .xlsx, .pdf, .docx files are supported")

        # Save the uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as temp_file:
            temp_file.write(await file.read())
            temp_path = temp_file.name

        # Parse the document to get chunks (semantically meaningful blocks)
        chunks: List[Document] = parse_file(temp_path)

        # For each chunk, use it as a question or infer a question and answer it
        results = []
        for chunk in chunks:
            question = chunk.page_content.strip()
            if not question:
                continue
            answer_data = generate_answer(question)

            results.append({
                "question": question,
                "answer": answer_data.get("answer", ""),
                "confidence_score": answer_data.get("confidence_score"),
                "sources": answer_data.get("sources", [])
            })

        # Clean up temp file
        os.remove(temp_path)

        return JSONResponse(content={"questions_and_answers": results})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process questionnaire: {str(e)}")