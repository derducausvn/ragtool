"""
openai_file_upload.py
---------------------
FastAPI endpoint to upload any knowledge file (Excel, PDF, Word, etc.) to OpenAI storage and attach to vector store.
"""

import os
import tempfile
import requests
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from openai_integration import upload_file_to_openai_storage, add_file_to_openai_assistant_vector_store
from web_utils import crawl_static_links
from bs4 import BeautifulSoup

router = APIRouter()

@router.post("/upload-knowledge-file")
async def upload_knowledge_file(file: UploadFile = File(...)):
    """
    Uploads a file to OpenAI storage and attaches it to the vector store for retrieval using the REST API.
    Accepts any file type supported by OpenAI (pdf, docx, txt, etc.).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")
    if not OPENAI_API_KEY or not VECTOR_STORE_ID:
        raise HTTPException(status_code=500, detail="OpenAI API key or Vector Store ID not configured.")
    try:
        # Save file temporarily
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, file.filename)
        with open(temp_path, "wb") as f_out:
            f_out.write(await file.read())
        # 1. Upload file to OpenAI storage
        url = "https://api.openai.com/v1/files"
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        with open(temp_path, "rb") as f_in:
            files = {"file": f_in, "purpose": (None, "assistants")}
            resp = requests.post(url, headers=headers, files=files)
        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail=f"OpenAI file upload failed: {resp.text}")
        file_id = resp.json()["id"]
        # 2. Attach file to vector store
        url2 = f"https://api.openai.com/v1/vector_stores/{VECTOR_STORE_ID}/files"
        data = {"file_id": file_id}
        resp2 = requests.post(url2, headers=headers, json=data)
        if resp2.status_code != 200:
            raise HTTPException(status_code=500, detail=f"OpenAI vector store attach failed: {resp2.text}")
        os.remove(temp_path)
        return JSONResponse(content={
            "message": "File uploaded and attached to vector store via REST API.",
            "file_id": file_id,
            "vector_store_id": VECTOR_STORE_ID
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/upload-website-content")
async def upload_website_content(payload: dict):
    """
    Crawls up to `max_pages` from the given URL's domain, aggregates main text, and uploads to OpenAI vector store.
    """
    import time
    
    url = payload.get("url")
    max_pages = payload.get("max_pages", 5)
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")
    if not OPENAI_API_KEY or not VECTOR_STORE_ID:
        raise HTTPException(status_code=500, detail="OpenAI API key or Vector Store ID not configured.")
    try:
        # Crawl up to max_pages from the domain
        urls = crawl_static_links(url, max_pages=max_pages)
        if not urls:
            raise HTTPException(status_code=400, detail="Could not fetch the website or no content found.")
        all_text = []
        for idx, page_url in enumerate(urls, 1):
            resp = requests.get(page_url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; Knowledge-Bot/1.0)'
            })
            if resp.status_code != 200:
                continue  # skip failed pages
            soup = BeautifulSoup(resp.text, "html.parser")
            text = soup.get_text(separator="\n", strip=True)
            if text and len(text) >= 100:
                all_text.append(f"\n--- PAGE {idx}: {page_url} ---\n{text}")
        if not all_text:
            raise HTTPException(status_code=400, detail="No usable content extracted from crawled pages.")
        combined_text = "\n\n".join(all_text)
        # Save to temp file
        temp_dir = tempfile.gettempdir()
        safe_name = f"website_{int(time.time())}_multi.txt"
        temp_path = os.path.join(temp_dir, safe_name)
        with open(temp_path, "w", encoding="utf-8") as f_out:
            f_out.write(combined_text)
        # Upload to OpenAI
        url_api = "https://api.openai.com/v1/files"
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        with open(temp_path, "rb") as f_in:
            files = {"file": f_in, "purpose": (None, "assistants")}
            resp = requests.post(url_api, headers=headers, files=files)
        if resp.status_code != 200:
            os.remove(temp_path)
            raise HTTPException(status_code=500, detail=f"OpenAI file upload failed: {resp.text}")
        file_id = resp.json()["id"]
        # Attach to vector store
        url2 = f"https://api.openai.com/v1/vector_stores/{VECTOR_STORE_ID}/files"
        data = {"file_id": file_id}
        resp2 = requests.post(url2, headers=headers, json=data)
        os.remove(temp_path)
        if resp2.status_code != 200:
            raise HTTPException(status_code=500, detail=f"OpenAI vector store attach failed: {resp2.text}")
        return JSONResponse(content={
            "message": f"Website content from {len(all_text)} pages uploaded and attached to vector store.",
            "file_id": file_id,
            "vector_store_id": VECTOR_STORE_ID,
            "pages_crawled": len(all_text),
            "source_urls": urls
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Website upload failed: {str(e)}")
