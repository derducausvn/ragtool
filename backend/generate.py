"""
generate.py (Refactored)
------------------------
Handles answer generation logic using GPT + knowledge base.
Supports two modes: knowledge-based QA and general chat.
Uses PGVector for persistent PostgreSQL-based vector storage.
"""

import os
import logging
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores.pgvector import PGVector
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

load_dotenv()

# --- Config ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")  # PostgreSQL connection string
COLLECTION_NAME = "rag_embeddings"  # Same as embedding.py

# --- Internal Cache ---
_embeddings = None
_llm = None

def get_embeddings():
    """Initialize OpenAI embedding instance once."""
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)
    return _embeddings

def get_llm():
    """Initialize OpenAI chat model once."""
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(
            model="gpt-4-1106-preview",
            temperature=0.7,
            api_key=OPENAI_API_KEY
        )
    return _llm

def is_no_information_answer(answer: str) -> bool:
    """
    Use LLM to detect if an answer implies lack of useful knowledge.
    Works cross-lingually.
    """
    try:
        prompt = f"""Analyze this answer and determine if it indicates the AI doesn't have relevant information.

Answer: "{answer}"

Does this answer indicate lack of knowledge or inability to provide useful information? Consider:
- Apologizing for not knowing
- Stating no information available
- Expressing inability to answer
- Providing vague or unhelpful responses
- Any language

Respond with only: YES or NO"""

        result = get_llm().invoke(prompt)
        return (result.content if hasattr(result, "content") else str(result)).strip().upper() == "YES"
    except Exception as e:
        logging.warning(f"No-info detection failed: {e}")
        return False

def extract_sources(docs: list) -> list:
    """
    Categorize sources from document metadata into readable types.
    """
    sources = set()
    for doc in docs:
        src = doc.metadata.get("source")
        if src:
            if src.startswith("http"):
                sources.add("F24 Websites & HelpDocs")
            else:
                sources.add("Knowledge Documents")
        elif doc.metadata.get("row") is not None:
            sources.add("Knowledge Documents")
    return sorted(sources)

def generate_answer(question: str, mode: str = "F24 QA Expert") -> dict:
    """
    Generate response from LLM with or without knowledge base depending on mode.
    Modes:
    - "F24 QA Expert": Uses PGVector PostgreSQL store
    - "General Chat": LLM-only response
    """
    if not OPENAI_API_KEY:
        return {"answer": "OpenAI API key not configured.", "sources": []}

    llm = get_llm()

    if mode == "General Chat":
        try:
            raw = llm.invoke(question)
            return {
                "answer": raw.content if hasattr(raw, "content") else str(raw),
                "sources": None
            }
        except Exception as e:
            return {"answer": f"LLM error: {e}", "sources": None}

    # Knowledge-based mode using PGVector
    try:
        embeddings = get_embeddings()
        db = PGVector(
            connection_string=DATABASE_URL,
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
        )
        
        retriever = db.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={"score_threshold": 0.3, "k": 10}
        )

        prompt = PromptTemplate.from_template("""
You are an AI assistant supporting F24's customer support team.  
Your task is to answer questions from customer questionnaires clearly, concisely, and in a form that can be directly pasted into the customer's document.  
You always answer as if you are F24, using "we" or "our" when appropriate.  
- Use the provided knowledge base to form accurate answers.  
- Respond factually and directly in the SAME LANGUAGE as the question.
- Use appropriate tone and terminology for a professional business response.  
- If little or no relevant information is found: say so clearly in the same language as the question (e.g., for English: "I currently do not have information available on this.", for German: "Ich habe derzeit keine Informationen dazu verf\u00fcgbar.").  
- Avoid hallucinating or guessing.  
- Never include "Answer:" before your response.  
- IMPORTANT: Always respond in the same language as the question.

Context: {context}  
Question: {question}
""")

        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=retriever,
            chain_type="stuff",
            chain_type_kwargs={"prompt": prompt},
            return_source_documents=True
        )

        result = qa_chain.invoke({"query": question})
        answer = result["result"]
        docs = result.get("source_documents", [])

        return {
            "answer": answer,
            "sources": [] if is_no_information_answer(answer) else extract_sources(docs)
        }

    except Exception as e:
        logging.error(f"Error during knowledge-based generation: {e}")
        return {"answer": f"Error accessing knowledge base: {e}", "sources": []}

# --- PLACEHOLDER ---
# Future extension: Azure OpenAI, logging question source, token cost tracking
