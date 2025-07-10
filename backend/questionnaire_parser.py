"""
questionnaire_parser.py
----------------------
Handles parsing of uploaded questionnaire files (Excel, PDF, DOCX, etc.) into question/answer chunks for answer generation.
"""

import os
import pandas as pd
from typing import List
from langchain.schema import Document
from langchain_unstructured import UnstructuredLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import logging
import openai

SUPPORTED_FORMATS = {"pdf", "docx", "txt", "eml", "html", "pptx", "rtf", "md", "json", "xlsx"}
DEFAULT_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 100

def create_text_splitter(chunk_size: int = DEFAULT_CHUNK_SIZE, chunk_overlap: int = DEFAULT_CHUNK_OVERLAP) -> RecursiveCharacterTextSplitter:
    """Factory for consistent text splitting across file types."""
    return RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

def parse_questionnaire_file(file_path: str) -> List[Document]:
    """
    Uses OpenAI Assistant (asst_LHcHlznpeN50voRNxJA8FgZV) to extract questions from any questionnaire file.
    Returns a list of Documents, one per detected question.
    """
    try:
        ext = file_path.split(".")[-1].lower()
        if ext not in SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported file format: {ext}")

        # 1. Extract raw content from file
        if ext == "xlsx":
            df = pd.read_excel(file_path)
            if df.empty:
                logging.warning(f"Excel file {file_path} is empty")
                return []
            # Convert the table to a string for LLM
            table_str = df.to_string(index=False)
            content_for_llm = f"Extract all questions or prompts from the following table.\n\n{table_str}"
        else:
            # For unstructured files, extract text
            loader = UnstructuredLoader(file_path)
            raw_docs = loader.load()
            if not raw_docs:
                logging.warning(f"No content extracted from {file_path}")
                return []
            text = "\n".join([doc.page_content for doc in raw_docs])
            content_for_llm = f"Extract all questions or prompts from the following text.\n\n{text}"

        # 2. Call OpenAI Assistant to extract questions
        assistant_id = "asst_LHcHlznpeN50voRNxJA8FgZV"
        openai.api_key = os.getenv("OPENAI_API_KEY")
        thread = openai.beta.threads.create()
        openai.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=content_for_llm
        )
        run = openai.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant_id
        )
        # Wait for completion
        import time
        while True:
            run_status = openai.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
            if run_status.status in ["completed", "failed", "cancelled"]:
                break
            time.sleep(1)
        if run_status.status != "completed":
            raise RuntimeError(f"Assistant run failed with status: {run_status.status}")
        messages = openai.beta.threads.messages.list(thread_id=thread.id)
        # Get the latest assistant message
        questions = []
        for msg in reversed(messages.data):
            if msg.role == "assistant":
                # Split by lines, filter out empty lines
                questions = [line.strip() for line in msg.content[0].text.value.splitlines() if line.strip()]
                break
        # 3. Return as Document objects
        docs = [Document(page_content=q, metadata={"source": os.path.basename(file_path), "idx": i}) for i, q in enumerate(questions)]
        logging.info(f"Extracted {len(docs)} questions from {file_path} using OpenAI Assistant.")
        return docs
    except Exception as e:
        logging.error(f"Failed to extract questions from {file_path} using Assistant: {e}")
        return []
