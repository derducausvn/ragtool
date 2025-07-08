"""
embedding.py
--------------------------
Handles embedding of documents and vector store operations using OpenAI + PGVector.
Stores embeddings persistently in PostgreSQL for production use on Render.
"""

import os
import logging
from typing import List
from dotenv import load_dotenv
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores.pgvector import PGVector
from langchain_openai import OpenAIEmbeddings

# Load environment variables
load_dotenv()

# Constants & Configurations
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")  # PostgreSQL connection string
COLLECTION_NAME = "rag_embeddings"  # Table name for embeddings
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
    Embed documents and persist them in PostgreSQL using PGVector.
    Creates or adds to the existing vector store.
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
        # Try to connect to existing vector store and add documents
        try:
            db = PGVector(
                connection_string=DATABASE_URL,
                collection_name=COLLECTION_NAME,
                embedding_function=embeddings,
            )
            # Add documents in batches
            for i in range(0, len(chunked_docs), batch_size):
                batch = chunked_docs[i:i + batch_size]
                try:
                    db.add_documents(batch)
                    logging.info(f"Embedded batch {i//batch_size + 1}: {len(batch)} documents")
                except Exception as e:
                    logging.error(f"Failed to embed batch {i//batch_size + 1}: {e}")
                    continue
        except Exception:
            # If connection fails, create new vector store from scratch
            db = PGVector.from_documents(
                chunked_docs,
                embeddings,
                connection_string=DATABASE_URL,
                collection_name=COLLECTION_NAME,
            )
            logging.info(f"Created new PGVector store with {len(chunked_docs)} documents")

        return len(chunked_docs)

    except Exception as e:
        logging.error(f"Embedding process failed: {e}")
        return 0

def search_documents(query: str, k: int = 5) -> List[Document]:
    """
    Perform similarity search on the embedded documents using PGVector.
    """
    try:
        embeddings = get_embeddings()
        db = PGVector(
            connection_string=DATABASE_URL,
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
        )
        docs = db.similarity_search(query, k=k)

        logging.info(f"Query: {query} → {len(docs)} matches")
        return docs

    except Exception as e:
        logging.error(f"Error during vector search: {e}")
        return []

def get_vector_store_stats() -> str:
    """
    Return basic stats about the PGVector store.
    """
    try:
        embeddings = get_embeddings()
        db = PGVector(
            connection_string=DATABASE_URL,
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
        )
        # Note: PGVector doesn't have a direct equivalent to ntotal
        # We'll do a simple query to check if the store is accessible
        test_docs = db.similarity_search("test", k=1)
        return f"Vector store is accessible (collection: {COLLECTION_NAME})"
    except Exception as e:
        return f"Failed to access vector store: {e}"

def get_sync_stats_live():
    """
    Get real-time KPI stats from PGVector store.
    Returns number of embedded chunks and website-based entries.
    """
    try:
        embeddings = get_embeddings()
        db = PGVector(
            connection_string=DATABASE_URL,
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
        )
        
        # Try to get some basic stats by doing test queries
        # PGVector doesn't expose direct document counts like FAISS
        test_docs = db.similarity_search("test", k=100)
        total_chunks = len(test_docs)
        
        # Count website-based chunks
        website_chunks = sum(
            1 for doc in test_docs
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
# Future replacement for PGVector with Azure Vector DB or Microsoft native embedding store
