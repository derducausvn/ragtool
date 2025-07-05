import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
import logging

load_dotenv()

VECTOR_DB_PATH = "vector_store"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Cache for embeddings and LLM
_embeddings = None
_llm = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)
    return _embeddings

def get_llm():
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model="gpt-3.5-turbo-1106", temperature=0.7, api_key=OPENAI_API_KEY)
    return _llm

def is_no_information_answer(answer: str) -> bool:
    """
    Use LLM to detect if answer indicates lack of knowledge - works for any language
    """
    try:
        llm = get_llm()
        
        prompt = f"""Analyze this answer and determine if it indicates the AI doesn't have relevant information.

Answer: "{answer}"

Does this answer indicate lack of knowledge or inability to provide useful information? Consider:
- Apologizing for not knowing
- Stating no information available  
- Expressing inability to answer
- Providing vague or unhelpful responses
- Any language

Respond with only: YES or NO"""

        response = llm.invoke(prompt)
        result = response.content.strip().upper() if hasattr(response, "content") else str(response).strip().upper()
        
        return result == "YES"
        
    except Exception as e:
        logging.warning(f"LLM no-information detection failed: {e}")
        return False  # If detection fails, assume information is available

def extract_sources(docs: list) -> list:
    """Extract and categorize sources from documents"""
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
    """Generate answer based on mode and available knowledge"""
    if not OPENAI_API_KEY:
        return {
            "answer": "OpenAI API key not configured.",
            "sources": []
        }

    llm = get_llm()

    # General Chat mode - simple conversational AI
    if mode == "General Chat":
        try:
            response = llm.invoke(question)
            answer = response.content if hasattr(response, "content") else str(response)
            return {
                "answer": answer,
                "sources": None
            }
        except Exception as e:
            return {
                "answer": f"Error generating answer: {str(e)}",
                "sources": None
            }

    # F24 QA Expert mode with knowledge base
    if not os.path.exists(VECTOR_DB_PATH):
        return {
            "answer": "Knowledge base is empty. Please sync knowledge first.",
            "sources": []
        }

    try:
        embeddings = get_embeddings()
        db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
        retriever = db.as_retriever(search_kwargs={"k": 5})

        # Create QA chain
        prompt = PromptTemplate.from_template("""
You are an AI assistant supporting F24's customer support team.  
Your task is to answer questions from customer questionnaires clearly, concisely, and in a form that can be directly pasted into the customer's document.  
You always answer as if you are F24, using "we" or "our" when appropriate.  
- Use the provided knowledge base to form accurate answers.  
- Respond factually and directly in the SAME LANGUAGE as the question.
- Use appropriate tone and terminology for a professional business response.  
- If little or no relevant information is found: say so clearly in the same language as the question (e.g., for English: "We currently do not have information available on this.", for German: "Wir haben derzeit keine Informationen dazu verfügbar.", etc.).  
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
        source_docs = result.get("source_documents", [])

        # Check if answer indicates no information available (works for any language)
        if is_no_information_answer(answer):
            return {
                "answer": answer,
                "sources": []
            }

        return {
            "answer": answer,
            "sources": extract_sources(source_docs)
        }

    except Exception as e:
        return {
            "answer": f"Error processing question: {str(e)}",
            "sources": []
        }