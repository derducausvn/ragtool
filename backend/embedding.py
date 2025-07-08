"""
embedding.py
--------------------------
Handles embedding of documents and vector store operations using OpenAI + FAISS.
Designed for future migration to Microsoft native vector DBs or Azure-hosted options.
"""

import os
import logging
from typing import List
from dotenv import load_dotenv
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# Load environment variables
load_dotenv()

# Constants & Configurations
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
VECTOR_DB_PATH = "vector_store"
MAX_CHARS = 800
CHUNK_OVERLAP = 100
BATCH_SIZE = 100

# Caches for singleton-like reuse
_embeddings = None
_text_splitter = None

def get_embeddings():
    """Initialize and return a cached OpenAI embedding instance."""
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(
            api_key=OPENAI_API_KEY,
            model="text-embedding-3-large"  
        )
    return _embeddings

def get_text_splitter():
    """Initialize and return a consistent text splitter."""
    global _text_splitter
    if _text_splitter is None:
        _text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=MAX_CHARS,
            chunk_overlap=CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
        )
    return _text_splitter

def chunk_documents(docs: List[Document]) -> List[Document]:
    """
    Split large documents into smaller chunks to improve embedding granularity.
    Metadata is preserved and enriched with chunk info.
    """
    splitter = get_text_splitter()
    chunked_docs = []

    for doc in docs:
        if len(doc.page_content) <= MAX_CHARS:
            chunked_docs.append(doc)
        else:
            chunks = splitter.split_documents([doc])
            for i, chunk in enumerate(chunks):
                chunk.metadata = {
                    **doc.metadata,
                    'chunk_id': i,
                    'total_chunks': len(chunks),
                    'original_doc_length': len(doc.page_content)
                }
            chunked_docs.extend(chunks)
            logging.info(f"Split document '{doc.metadata.get('source', '')}' into {len(chunks)} chunks")

    return chunked_docs

def embed_documents(docs: List[Document], batch_size: int = BATCH_SIZE) -> int:
    """
    Embed documents and persist them in FAISS vector DB.
    Automatically loads or creates the vector store.
    """
    if not docs:
        logging.info("No documents to embed.")
        return 0

    chunked_docs = chunk_documents(docs)
    if not chunked_docs:
        logging.warning("No documents to embed after chunking.")
        return 0

    embeddings = get_embeddings()

    try:
        # Load existing or create new vector store
        if os.path.exists(VECTOR_DB_PATH):
            db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
            for i in range(0, len(chunked_docs), batch_size):
                batch = chunked_docs[i:i + batch_size]
                try:
                    db.add_documents(batch)
                    logging.info(f"Embedded batch {i//batch_size + 1}: {len(batch)} documents")
                except Exception as e:
                    logging.error(f"Failed to embed batch {i//batch_size + 1}: {e}")
                    continue
        else:
            db = FAISS.from_documents(chunked_docs, embeddings)
            logging.info(f"Created new vector store with {len(chunked_docs)} documents")

        db.save_local(VECTOR_DB_PATH)
        return len(chunked_docs)

    except Exception as e:
        logging.error(f"Embedding process failed: {e}")
        return 0

def search_documents(query: str, k: int = 5) -> List[Document]:
    """
    Perform similarity search on the embedded documents.
    """
    if not os.path.exists(VECTOR_DB_PATH):
        logging.warning("Vector store not found.")
        return []

    try:
        embeddings = get_embeddings()
        db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
        docs = db.similarity_search(query, k=k)

        logging.info(f"Query: {query} → {len(docs)} matches")
        return docs

    except Exception as e:
        logging.error(f"Error during vector search: {e}")
        return []

def get_vector_store_stats() -> str:
    """
    Return basic stats about the vector DB.
    """
    if not os.path.exists(VECTOR_DB_PATH):
        return "Vector store not found."

    try:
        embeddings = get_embeddings()
        db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
        return f"Vector store contains {db.index.ntotal} documents."
    except Exception as e:
        return f"Failed to load vector store: {e}"

def get_sync_stats_live():
    """
    Get real-time KPI stats from vector store.
    Returns number of embedded chunks and website-based entries.
    """
    from langchain_community.vectorstores import FAISS

    if not os.path.exists(VECTOR_DB_PATH):
        return {"documents": 0, "websites": 0, "syncProgress": 0}

    try:
        embeddings = get_embeddings()
        db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)

        total_chunks = db.index.ntotal
        website_chunks = sum(
            1 for doc in db.docstore._dict.values()
            if doc.metadata.get("source", "").startswith("http")
        )

        return {
            "documents": total_chunks,
            "websites": website_chunks,
            "syncProgress": 100
        }

    except Exception as e:
        return {"documents": 0, "websites": 0, "syncProgress": 0, "error": str(e)}

# --- PLACEHOLDER: Optional Migration ---
# Future replacement for FAISS with Azure Vector DB or Microsoft native embedding store
