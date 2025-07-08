"""
embedding.py
--------------------------
Handles embedding of documents and vector store operations using OpenAI + PGVector.
Stores embeddings persistently in PostgreSQL for production use on Render.
"""

import os
import logging
import re
from typing import List
from dotenv import load_dotenv
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

# Try new langchain_postgres first, fallback to legacy if not available
try:
    from langchain_postgres import PGVector
    USING_NEW_PGVECTOR = True
    logging.info("✅ Using new langchain_postgres.PGVector (with JSONB support)")
except ImportError:
    from langchain_community.vectorstores.pgvector import PGVector
    USING_NEW_PGVECTOR = False
    logging.info("⚠️  Using legacy langchain_community.vectorstores.pgvector.PGVector")

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
    Also sanitizes content to remove problematic characters.
    """
    splitter = get_text_splitter()
    chunked_docs = []

    for doc in docs:
        # Sanitize content - remove NUL bytes and other problematic characters
        sanitized_content = doc.page_content.replace('\x00', '').replace('\ufeff', '')
        # Remove other control characters except newlines and tabs
        sanitized_content = ''.join(char for char in sanitized_content 
                                  if ord(char) >= 32 or char in '\n\t\r')
        doc.page_content = sanitized_content
        
        if len(doc.page_content) <= MAX_CHARS:
            chunked_docs.append(doc)
        else:
            chunks = splitter.split_documents([doc])
            for i, chunk in enumerate(chunks):
                # Sanitize chunk content too
                chunk.page_content = chunk.page_content.replace('\x00', '').replace('\ufeff', '')
                chunk.page_content = ''.join(char for char in chunk.page_content 
                                           if ord(char) >= 32 or char in '\n\t\r')
                
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
    embedded_count = 0

    try:
        # Initialize PGVector with appropriate API
        if USING_NEW_PGVECTOR:
            # New langchain_postgres implementation with JSONB support
            db = PGVector(
                embeddings=embeddings,
                connection=DATABASE_URL,
                collection_name=COLLECTION_NAME,
                use_jsonb=True,  # Use JSONB for metadata storage (more efficient)
            )
        else:
            # Legacy implementation
            db = PGVector(
                connection_string=DATABASE_URL,
                collection_name=COLLECTION_NAME,
                embedding_function=embeddings,
            )
        
        # Add documents in batches with better error handling
        total_batches = (len(chunked_docs) + batch_size - 1) // batch_size
        failed_batches = []
        
        for i in range(0, len(chunked_docs), batch_size):
            batch_num = i // batch_size + 1
            batch = chunked_docs[i:i + batch_size]
            
            try:
                # Extra sanitization for this batch
                for doc in batch:
                    # Additional cleaning to prevent NUL byte errors
                    doc.page_content = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', doc.page_content)
                    # Ensure metadata values are JSON-serializable
                    for key, value in doc.metadata.items():
                        if isinstance(value, str):
                            doc.metadata[key] = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', value)
                
                db.add_documents(batch)
                embedded_count += len(batch)
                logging.info(f"✅ Embedded batch {batch_num}/{total_batches}: {len(batch)} documents")
                
            except Exception as e:
                failed_batches.append(batch_num)
                logging.error(f"❌ Failed to embed batch {batch_num}/{total_batches}: {e}")
                # Try to process documents individually in this batch
                individual_successes = 0
                for doc in batch:
                    try:
                        db.add_documents([doc])
                        individual_successes += 1
                        embedded_count += 1
                    except Exception as doc_error:
                        logging.warning(f"   Skipped document from batch {batch_num}: {doc_error}")
                
                if individual_successes > 0:
                    logging.info(f"   Recovered {individual_successes}/{len(batch)} documents individually")
        
        # Summary logging
        if failed_batches:
            logging.warning(f"⚠️  Failed batches: {failed_batches} (but some documents may have been recovered)")
        logging.info(f"🎯 Total embedded: {embedded_count}/{len(chunked_docs)} documents")
        
        return embedded_count

    except Exception as e:
        logging.error(f"❌ Embedding process failed completely: {e}")
        return 0

def search_documents(query: str, k: int = 5) -> List[Document]:
    """
    Perform similarity search on the embedded documents using PGVector.
    """
    try:
        embeddings = get_embeddings()
        
        if USING_NEW_PGVECTOR:
            # New langchain_postgres implementation
            db = PGVector(
                embeddings=embeddings,
                connection=DATABASE_URL,
                collection_name=COLLECTION_NAME,
                use_jsonb=True,
            )
        else:
            # Legacy implementation
            db = PGVector(
                connection_string=DATABASE_URL,
                collection_name=COLLECTION_NAME,
                embedding_function=embeddings,
            )
        
        docs = db.similarity_search(query, k=k)

        logging.info(f"🔍 Query: '{query}' → {len(docs)} matches")
        return docs

    except Exception as e:
        logging.error(f"❌ Error during vector search: {e}")
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
        # First try to get exact counts from PostgreSQL
        exact_total, exact_websites = get_exact_document_count()
        
        if exact_total is not None:
            # We got exact counts from PostgreSQL
            return {
                "documents": exact_total,
                "websites": exact_websites,
                "lastSync": "Recently synced" if exact_total > 0 else None,
                "syncProgress": 100
            }
        
        # Fallback to similarity search estimation
        embeddings = get_embeddings()
        
        if USING_NEW_PGVECTOR:
            # New langchain_postgres implementation
            db = PGVector(
                embeddings=embeddings,
                connection=DATABASE_URL,
                collection_name=COLLECTION_NAME,
                use_jsonb=True,
            )
        else:
            # Legacy implementation
            db = PGVector(
                connection_string=DATABASE_URL,
                collection_name=COLLECTION_NAME,
                embedding_function=embeddings,
            )
        
        # Get a larger sample to estimate total documents
        # We'll use a high k value and search for a common term
        sample_docs = db.similarity_search("the", k=5000)  # Get up to 5000 docs
        total_chunks = len(sample_docs)
        
        # If we got exactly 5000, there might be more - try to get a better estimate
        if total_chunks == 5000:
            # Try a few more searches to get a better sample
            additional_samples = [
                db.similarity_search("F24", k=1000),
                db.similarity_search("question", k=1000),
                db.similarity_search("document", k=1000),
            ]
            all_seen_ids = set()
            for docs in [sample_docs] + additional_samples:
                for doc in docs:
                    # Use content hash as unique identifier
                    doc_id = hash(doc.page_content[:100])
                    all_seen_ids.add(doc_id)
            total_chunks = len(all_seen_ids)
        
        # Count website-based chunks from our sample
        website_chunks = sum(
            1 for doc in sample_docs
            if doc.metadata.get("source", "").startswith("http")
        )
        
        # Get last sync time (approximate - when we last had docs)
        last_sync = None
        if sample_docs:
            # Use the collection name as a proxy for when data was last added
            last_sync = "Recently synced"

        logging.info(f"📊 Estimated stats: {total_chunks} total chunks, {website_chunks} from websites")

        return {
            "documents": total_chunks,
            "websites": website_chunks,
            "lastSync": last_sync,
            "syncProgress": 100
        }

    except Exception as e:
        logging.error(f"Failed to get sync stats: {e}")
        return {"documents": 0, "websites": 0, "lastSync": None, "syncProgress": 0, "error": str(e)}

def get_exact_document_count():
    """
    Get exact document count by querying PostgreSQL directly.
    This is more accurate than similarity search sampling.
    """
    try:
        import psycopg2
        from urllib.parse import urlparse
        
        # Parse DATABASE_URL to get connection parameters
        url = urlparse(DATABASE_URL)
        
        conn = psycopg2.connect(
            host=url.hostname,
            port=url.port,
            database=url.path[1:],  # Remove leading slash
            user=url.username,
            password=url.password
        )
        
        cursor = conn.cursor()
        
        # Query the exact table name for our collection
        # PGVector stores documents in a table named after the collection
        table_name = f"langchain_pg_embedding"  # Default table name
        
        # Get total document count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE collection_id = (SELECT uuid FROM langchain_pg_collection WHERE name = %s)", (COLLECTION_NAME,))
        total_count = cursor.fetchone()[0]
        
        # Get website-based document count
        cursor.execute(f"""
            SELECT COUNT(*) FROM {table_name} e
            JOIN langchain_pg_collection c ON e.collection_id = c.uuid
            WHERE c.name = %s AND e.cmetadata->>'source' LIKE 'http%'
        """, (COLLECTION_NAME,))
        website_count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        logging.info(f"📊 Exact counts: {total_count} total chunks, {website_count} from websites")
        return total_count, website_count
        
    except Exception as e:
        logging.warning(f"Could not get exact count from PostgreSQL: {e}")
        return None, None

# --- PLACEHOLDER: Optional Migration ---
# Future replacement for PGVector with Azure Vector DB or Microsoft native embedding store
