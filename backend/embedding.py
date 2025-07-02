from typing import List
from langchain.schema import Document
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
import os
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

VECTOR_DB_PATH = "vector_store"
MAX_CHARS = 5000  # Limit long documents (~1000-1500 tokens)

def embed_documents(docs: List[Document], batch_size: int = 100) -> int:
    if not docs:
        print("No documents to embed.")
        return 0

    # Filter out overly long docs
    long_docs = [doc for doc in docs if len(doc.page_content) > MAX_CHARS]
    docs = [doc for doc in docs if len(doc.page_content) <= MAX_CHARS]

    if long_docs:
        print(f"[embedding] Skipped {len(long_docs)} oversized docs:")
        for doc in long_docs:
            print(" -", doc.metadata.get("source", "unknown"))

    # Ensure each doc has a source
    for doc in docs:
        doc.metadata["source"] = doc.metadata.get("source", "unknown")

    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)

    if os.path.exists(VECTOR_DB_PATH):
        db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
    else:
        db = FAISS.from_documents([], embeddings)

    for i in range(0, len(docs), batch_size):
        batch = docs[i:i + batch_size]
        try:
            db.add_documents(batch)
        except Exception as e:
            print(f"[embedding] Failed to embed batch {i}–{i+batch_size}: {e}")

    db.save_local(VECTOR_DB_PATH)
    return len(docs)
