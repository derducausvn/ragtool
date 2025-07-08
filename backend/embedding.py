import os
from typing import List
from langchain.schema import Document
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
import logging

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
VECTOR_DB_PATH = "vector_store"
MAX_CHARS = 800  # Smaller chunks for better retrieval
CHUNK_OVERLAP = 100  # Overlap between chunks
BATCH_SIZE = 100

# Cache embeddings instance
_embeddings = None
_text_splitter = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(
            api_key=OPENAI_API_KEY,
            model="text-embedding-3-small"
        )
    return _embeddings

def get_text_splitter():
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
    """Split documents into smaller chunks while preserving metadata"""
    text_splitter = get_text_splitter()
    chunked_docs = []
    
    for doc in docs:
        if len(doc.page_content) <= MAX_CHARS:
            # Document is already small enough
            chunked_docs.append(doc)
        else:
            # Split large document into chunks
            chunks = text_splitter.split_documents([doc])
            
            # Preserve and enhance metadata for each chunk
            for i, chunk in enumerate(chunks):
                chunk.metadata = {
                    **doc.metadata,  # Preserve original metadata
                    'chunk_id': i,
                    'total_chunks': len(chunks),
                    'original_doc_length': len(doc.page_content)
                }
            
            chunked_docs.extend(chunks)
            logging.info(f"Split document into {len(chunks)} chunks")
    
    return chunked_docs

def embed_documents(docs: List[Document], batch_size: int = BATCH_SIZE) -> int:
    """Embed documents and add to vector store"""
    if not docs:
        logging.info("No documents to embed")
        return 0

    # Chunk documents instead of filtering them out
    chunked_docs = chunk_documents(docs)
    if not chunked_docs:
        logging.warning("No documents to embed after chunking")
        return 0

    embeddings = get_embeddings()

    try:
        # Load existing database or create new one
        if os.path.exists(VECTOR_DB_PATH):
            db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
            
            # Add documents in batches
            for i in range(0, len(chunked_docs), batch_size):
                batch = chunked_docs[i:i + batch_size]
                try:
                    db.add_documents(batch)
                    logging.info(f"Added batch {i//batch_size + 1}: {len(batch)} documents")
                except Exception as e:
                    logging.error(f"Failed to embed batch {i//batch_size + 1}: {e}")
                    continue
        else:
            # Create new database
            db = FAISS.from_documents(chunked_docs, embeddings)
            logging.info(f"Created new vector store with {len(chunked_docs)} documents")

        # Save updated database
        db.save_local(VECTOR_DB_PATH)
        return len(chunked_docs)

    except Exception as e:
        logging.error(f"Error in embedding process: {e}")
        return 0

def search_documents(query: str, k: int = 5) -> List[Document]:
    """Search for relevant documents"""
    if not os.path.exists(VECTOR_DB_PATH):
        logging.warning("Vector store not found")
        return []
    
    try:
        embeddings = get_embeddings()
        db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
        docs = db.similarity_search(query, k=k)
        
        # Debug logging
        logging.info(f"Query: {query}")
        logging.info(f"Found {len(docs)} relevant documents")
        for i, doc in enumerate(docs):
            logging.info(f"Doc {i}: {doc.page_content[:100]}...")
        
        return docs
    except Exception as e:
        logging.error(f"Error searching documents: {e}")
        return []

def get_vector_store_stats():
    """Get statistics about the vector store"""
    if not os.path.exists(VECTOR_DB_PATH):
        return "Vector store not found"
    
    try:
        embeddings = get_embeddings()
        db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
        return f"Vector store contains {db.index.ntotal} documents"
    except Exception as e:
        return f"Error reading vector store: {e}"