import os
import pandas as pd
from typing import List
from langchain.schema import Document
from langchain_unstructured import UnstructuredLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

UNSTRUCTURED_FORMATS = [
    "pdf", "docx", "txt", "eml", "html", "pptx", "rtf", "md", "json"
]

def parse_file(file_path: str) -> List[Document]:
    ext = file_path.split(".")[-1].lower()
    if ext in UNSTRUCTURED_FORMATS:
        docs = parse_with_unstructured(file_path)
    elif ext == "xlsx":
        docs = parse_excel(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    # Set 'source' in metadata for all docs
    for doc in docs:
        doc.metadata["source"] = file_path

    return docs

def parse_with_unstructured(file_path: str) -> List[Document]:
    loader = UnstructuredLoader(file_path)
    raw_docs = loader.load()

    # Add source to metadata
    for doc in raw_docs:
        doc.metadata["source"] = file_path

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
    )
    return splitter.split_documents(raw_docs)

def parse_excel(file_path: str) -> List[Document]:
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"Error reading Excel file {file_path}: {e}")
        return []

    documents = []

    if "Question" in df.columns:
        for idx, row in df.iterrows():
            question = str(row["Question"]).strip()
            answer = str(row["Answer"]).strip() if "Answer" in df.columns else ""
            content = f"Q: {question}\nA: {answer}"
            documents.append(Document(page_content=content, metadata={"row": idx, "source": file_path}))

    else:
        for idx, row in df.iterrows():
            content = " | ".join([str(cell).strip() for cell in row if pd.notnull(cell)])
            documents.append(Document(page_content=content, metadata={"row": idx, "source": file_path}))

    return documents
