from typing import List
from langchain.schema import Document
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
import os
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

VECTOR_DB_PATH = "vector_store"
MAX_CHARS = 5000  # Limit long documents

def embed_documents(docs: List[Document], batch_size: int = 100) -> int:
    if not docs:
        print("[embedding] No documents to embed.")
        return 0

    # Filter out overly long docs
    docs = [doc for doc in docs if len(doc.page_content) <= MAX_CHARS]
    if not docs:
        print("[embedding] All documents were too long — nothing to embed.")
        return 0

    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)

    if os.path.exists(VECTOR_DB_PATH):
        db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
    else:
        db = FAISS.from_documents(docs, embeddings)  # Initialize properly without deleting
        db.save_local(VECTOR_DB_PATH)
        return len(docs)

    for i in range(0, len(docs), batch_size):
        batch = docs[i:i + batch_size]
        try:
            db.add_documents(batch)
        except Exception as e:
            print(f"[embedding] Failed to embed batch {i}–{i+batch_size}: {e}")

    db.save_local(VECTOR_DB_PATH)
    return len(docs)

