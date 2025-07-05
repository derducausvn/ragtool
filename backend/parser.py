import pandas as pd
from typing import List
from langchain.schema import Document
from langchain_unstructured import UnstructuredLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import logging

UNSTRUCTURED_FORMATS = {
    "pdf", "docx", "txt", "eml", "html", "pptx", "rtf", "md", "json"
}

def create_text_splitter(chunk_size: int = 1000, chunk_overlap: int = 150) -> RecursiveCharacterTextSplitter:
    """Create a text splitter with specified parameters"""
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

def parse_file(file_path: str) -> List[Document]:
    """Parse file based on extension and return list of documents"""
    try:
        ext = file_path.split(".")[-1].lower()
        
        if ext in UNSTRUCTURED_FORMATS:
            docs = parse_with_unstructured(file_path)
        elif ext == "xlsx":
            docs = parse_excel(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        # Set source metadata for all documents
        for doc in docs:
            doc.metadata["source"] = file_path

        logging.info(f"Parsed {len(docs)} documents from {file_path}")
        return docs

    except Exception as e:
        logging.error(f"Error parsing file {file_path}: {e}")
        return []

def parse_with_unstructured(file_path: str) -> List[Document]:
    """Parse file using UnstructuredLoader and split into chunks"""
    try:
        loader = UnstructuredLoader(file_path)
        raw_docs = loader.load()
        
        if not raw_docs:
            logging.warning(f"No content extracted from {file_path}")
            return []

        # Split documents into chunks
        splitter = create_text_splitter()
        return splitter.split_documents(raw_docs)

    except Exception as e:
        logging.error(f"Error with unstructured parsing of {file_path}: {e}")
        return []

def parse_excel(file_path: str) -> List[Document]:
    """Parse Excel file and create documents from rows"""
    try:
        df = pd.read_excel(file_path)
        
        if df.empty:
            logging.warning(f"Excel file {file_path} is empty")
            return []

        documents = []

        # Handle Q&A format
        if "Question" in df.columns:
            for idx, row in df.iterrows():
                question = str(row["Question"]).strip()
                if not question or question == "nan":
                    continue
                    
                answer = str(row.get("Answer", "")).strip() if "Answer" in df.columns else ""
                content = f"Q: {question}\nA: {answer}" if answer and answer != "nan" else f"Q: {question}"
                
                documents.append(Document(
                    page_content=content,
                    metadata={"row": idx, "source": file_path}
                ))
        else:
            # Handle general tabular data
            for idx, row in df.iterrows():
                # Join non-null values
                values = [str(cell).strip() for cell in row if pd.notnull(cell) and str(cell).strip()]
                if values:
                    content = " | ".join(values)
                    documents.append(Document(
                        page_content=content,
                        metadata={"row": idx, "source": file_path}
                    ))

        logging.info(f"Parsed {len(documents)} rows from Excel file {file_path}")
        return documents

    except Exception as e:
        logging.error(f"Error reading Excel file {file_path}: {e}")
        return []