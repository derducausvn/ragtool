import os
from dotenv import load_dotenv
load_dotenv()
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from sklearn.metrics.pairwise import cosine_similarity
from langchain.schema import SystemMessage, HumanMessage
import numpy as np
import requests
from bs4 import BeautifulSoup

VECTOR_DB_PATH = "vector_store"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def fetch_web_snippets(query: str, num_results: int = 3) -> str:
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
        res = requests.get(search_url, headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")
        snippets = []
        for g in soup.select("div.VwiC3b")[:num_results]:
            snippets.append(g.text)
        return "\n".join(snippets)
    except Exception as e:
        print(f"[WebSearch] Failed: {e}")
        return ""


def generate_answer(question: str, mode: str = "F24 QA Expert") -> dict:
    if not OPENAI_API_KEY:
        return {
            "answer": "OpenAI API key not found.",
            "confidence_score": None,
            "sources": []
        }

    llm = ChatOpenAI(model="gpt-3.5-turbo-1106", temperature=0.7, api_key=OPENAI_API_KEY)

    # --- MODE 1: General Chat with simulated browsing ---
    if mode == "General Chat":
        web_snippets = fetch_web_snippets(question)
        prompt = f"""You are a helpful and neutral AI assistant. Use the web info below to answer naturally.

Information from the web:
{web_snippets}

Question: {question}
Answer:
"""
        response = llm.invoke(prompt)
        answer = response.content if hasattr(response, "content") else str(response)

        return {
            "answer": answer,
            "confidence_score": None,
            "sources": []
        }

    # --- MODE 2: F24 QA Expert (with retrieval) ---
    if not os.path.exists(VECTOR_DB_PATH):
        return {
            "answer": "Knowledge base is empty.",
            "confidence_score": 0.0,
            "sources": []
        }

    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)
    db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
    retriever = db.as_retriever(search_kwargs={"k": 5})
    docs = retriever.invoke(question)

    # Confidence score
    question_vector = embeddings.embed_query(question)
    doc_vectors = [embeddings.embed_query(doc.page_content) for doc in docs]
    sims = cosine_similarity([question_vector], doc_vectors)[0]
    top_sim_avg = float(np.mean(sorted(sims, reverse=True)[:3]))
    confidence_score = round(top_sim_avg, 3)

    # Prompt with retrieval
    prompt = PromptTemplate.from_template("""
You are a helpful assistant trained to answer customer questionnaires for F24.  
You understand both general and specific questions, even if they are informal or vague.  
Always try your best to help using the available context.  
If very little or no relevant context is found, politely respond based on your general understanding, or politely decline to answer to advoid hallucinating.
In most cases, 'you' refers to F24, as the questions are coming from F24's customers.
Questions can be in different languages besides English, so respond correspondingly.

Context: {context}
Question: {question}
Answer:
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
    sources = result.get("source_documents", [])

    fallback_phrases = [
        "i'm sorry", "no relevant context", "cannot find", "don't know",
        "no information", "unable to answer", "does not include information", "i don't", "does not", "do not", "no data"
    ]
    is_fallback = any(phrase in answer.lower() for phrase in fallback_phrases)

    if is_fallback or confidence_score < 0.3:
        return {
            "answer": answer,
            "sources": []
        }

    mentioned_sources = set()
    for doc in sources:
        src = doc.metadata.get("source")
        if src:
            if src.startswith("http"):
                mentioned_sources.add("F24 Websites & HelpDocs")
            else:
                mentioned_sources.add("Knowledge Documents")
        elif doc.metadata.get("row") is not None:
            mentioned_sources.add("Knowledge Documents")

    return {
        "answer": answer,
        "confidence_score": confidence_score,
        "sources": sorted(mentioned_sources)
    }
