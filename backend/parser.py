"""
parser.py (Refactored)
----------------------
Parses and splits uploaded files (Excel, PDF, DOCX, etc.) into LangChain Documents.
Cleansed of unused branches and simplified for maintainability.
Supports Microsoft migration via a unified parser structure.
"""

import os
import pandas as pd
from typing import List
from langchain.schema import Document
from langchain_unstructured import UnstructuredLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import logging

# Supported formats for unstructured loader
SUPPORTED_FORMATS = {"pdf", "docx", "txt", "eml", "html", "pptx", "rtf", "md", "json", "xlsx"}

# Default chunking settings
DEFAULT_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 100

def create_text_splitter(chunk_size: int = DEFAULT_CHUNK_SIZE, chunk_overlap: int = DEFAULT_CHUNK_OVERLAP) -> RecursiveCharacterTextSplitter:
    """Factory for consistent text splitting across file types."""
    return RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

def parse_file(file_path: str) -> List[Document]:
    """
    Detect file type and delegate to appropriate parser. Returns a list of Documents.
    Each document contains metadata including 'source' and optionally row/section.
    """
    try:
        ext = file_path.split(".")[-1].lower()
        if ext not in SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported file format: {ext}")

        if ext == "xlsx":
            docs = parse_excel(file_path)
        else:
            docs = parse_unstructured_file(file_path)

        for doc in docs:
            doc.metadata["source"] = os.path.basename(file_path)

        logging.info(f"Parsed {len(docs)} documents from {file_path}")
        return docs

    except Exception as e:
        logging.error(f"Failed to parse {file_path}: {e}")
        return []

def parse_unstructured_file(file_path: str) -> List[Document]:
    """
    Load non-tabular files using UnstructuredLoader and split them into chunks.
    """
    try:
        loader = UnstructuredLoader(file_path)
        raw_docs = loader.load()
        if not raw_docs:
            logging.warning(f"No content extracted from {file_path}")
            return []

        splitter = create_text_splitter()
        return splitter.split_documents(raw_docs)

    except Exception as e:
        logging.error(f"Unstructured parsing failed for {file_path}: {e}")
        return []

def parse_excel(file_path: str) -> List[Document]:
    """
    Handle Q&A Excel files or general tabular data.
    If column 'Question' exists, treat rows as Q&A pairs.
    Otherwise, join row contents as text.
    """
    try:
        df = pd.read_excel(file_path)
        if df.empty:
            logging.warning(f"Excel file {file_path} is empty")
            return []

        documents = []
        if "Question" in df.columns:
            for idx, row in df.iterrows():
                q = str(row["Question"]).strip()
                if not q or q == "nan":
                    continue
                a = str(row.get("Answer", "")).strip()
                content = f"Q: {q}\nA: {a}" if a else f"Q: {q}"
                documents.append(Document(page_content=content, metadata={"row": idx}))
        else:
            for idx, row in df.iterrows():
                values = [str(cell).strip() for cell in row if pd.notnull(cell) and str(cell).strip()]
                if values:
                    content = " | ".join(values)
                    documents.append(Document(page_content=content, metadata={"row": idx}))

        logging.info(f"Parsed {len(documents)} rows from Excel file {file_path}")
        return documents

    except Exception as e:
        logging.error(f"Error reading Excel file {file_path}: {e}")
        return []

# --- PLACEHOLDER: Future Integration ---
# - Microsoft Graph Excel parser
# - SharePoint document loaders
# - OCR/image parsing if needed
