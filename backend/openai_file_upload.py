"""
openai_file_upload.py
---------------------
FastAPI endpoint to upload any knowledge file (Excel, PDF, Word, etc.) to OpenAI storage and attach to vector store.
"""

import os
import tempfile
import time
import requests
import logging
import hashlib
import openai  # Add openai import for helper functions
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from web_utils import crawl_static_links
from bs4 import BeautifulSoup
from excel_to_pdf_converter import convert_excel_for_knowledge_base, is_excel_file

router = APIRouter()

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Helper functions moved from openai_integration.py
def upload_file_to_openai_storage(file_path: str, purpose: str = "assistants") -> str:
    """
    Uploads a file to OpenAI's file storage for use with Assistants.
    Returns the OpenAI file ID on success, or raises an exception on failure.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    openai.api_key = OPENAI_API_KEY
    try:
        with open(file_path, "rb") as f:
            response = openai.files.create(file=f, purpose=purpose)
        file_id = response.id
        logging.info(f"Uploaded {file_path} to OpenAI storage with file_id: {file_id}")
        return file_id
    except Exception as e:
        logging.error(f"Failed to upload {file_path} to OpenAI storage: {e}")
        raise

def add_file_to_openai_assistant_vector_store(file_id: str, assistant_id: str = None) -> str:
    """
    Attaches a file to the central OpenAI vector store for retrieval by the assistant.
    Returns the Assistant ID.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    openai.api_key = OPENAI_API_KEY
    VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")
    if not VECTOR_STORE_ID:
        raise ValueError("OPENAI_VECTOR_STORE_ID environment variable not set.")
    try:
        # Attach file to the central vector store (not just a thread)
        openai.beta.vector_stores.files.create(
            vector_store_id=VECTOR_STORE_ID,
            file_id=file_id
        )
        logging.info(f"Attached file {file_id} to vector store {VECTOR_STORE_ID}.")
        # Optionally, update the assistant to use this vector store if not already
        if assistant_id is not None:
            openai.beta.assistants.update(
                assistant_id=assistant_id,
                tool_resources={"file_search": {"vector_store_ids": [VECTOR_STORE_ID]}}
            )
            logging.info(f"Ensured assistant {assistant_id} uses vector store {VECTOR_STORE_ID}.")
        return assistant_id
    except Exception as e:
        logging.error(f"Failed to add file {file_id} to vector store: {e}")
        raise

def get_vector_store_files():
    """
    Gets all files from the OpenAI vector store along with their metadata.
    Returns a list of file dictionaries with id, filename, size, and created_at.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    
    VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")
    if not VECTOR_STORE_ID:
        raise ValueError("OPENAI_VECTOR_STORE_ID environment variable not set.")
    
    try:
        # Get files from vector store
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        url = f"https://api.openai.com/v1/vector_stores/{VECTOR_STORE_ID}/files"
        
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Failed to get vector store files: {response.text}")
        
        vector_files = response.json().get("data", [])
        
        # Get detailed file information for each file
        files_with_details = []
        for vf in vector_files:
            file_id = vf.get("id")
            if file_id:
                # Get file details from OpenAI files API
                file_url = f"https://api.openai.com/v1/files/{file_id}"
                file_resp = requests.get(file_url, headers=headers)
                if file_resp.status_code == 200:
                    file_data = file_resp.json()
                    files_with_details.append({
                        "id": file_id,
                        "filename": file_data.get("filename", "Unknown"),
                        "size": file_data.get("bytes", 0),
                        "created_at": file_data.get("created_at", 0),
                        "purpose": file_data.get("purpose", "assistants")
                    })
        
        return files_with_details
    except Exception as e:
        logging.error(f"Failed to get vector store files: {e}")
        raise

def check_duplicate_file(filename: str, file_size: int):
    """
    Checks if a file with the same name and size already exists in the vector store.
    Returns the existing file info if found, None otherwise.
    """
    try:
        existing_files = get_vector_store_files()
        for file_info in existing_files:
            if (file_info["filename"] == filename and 
                file_info["size"] == file_size):
                return file_info
        return None
    except Exception as e:
        logging.error(f"Error checking for duplicate file: {e}")
        return None

def delete_file_from_vector_store(file_id: str):
    """
    Removes a file from the vector store and deletes it from OpenAI storage.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    
    VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")
    if not VECTOR_STORE_ID:
        raise ValueError("OPENAI_VECTOR_STORE_ID environment variable not set.")
    
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
    
    try:
        # First, remove from vector store
        vs_url = f"https://api.openai.com/v1/vector_stores/{VECTOR_STORE_ID}/files/{file_id}"
        vs_resp = requests.delete(vs_url, headers=headers)
        
        if vs_resp.status_code not in [200, 204]:
            logging.warning(f"Failed to remove file from vector store: {vs_resp.text}")
        
        # Then delete the file from OpenAI storage
        file_url = f"https://api.openai.com/v1/files/{file_id}"
        file_resp = requests.delete(file_url, headers=headers)
        
        if file_resp.status_code not in [200, 204]:
            logging.warning(f"Failed to delete file from OpenAI storage: {file_resp.text}")
        
        return True
    except Exception as e:
        logging.error(f"Failed to delete file {file_id}: {e}")
        raise

# Utility function for safe file cleanup
def safe_cleanup_error(file_path):
    """Cleanup file ignoring any errors (for error handling scenarios)."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except:
        pass  # Ignore cleanup errors during error handling

def safe_cleanup_with_retry(file_path, max_retries=3):
    """Safely cleanup files with retry logic for Windows file locking issues."""
    for attempt in range(max_retries):
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            return
        except PermissionError as e:
            if attempt < max_retries - 1:
                logging.info(f"File locked, retrying cleanup in 0.5s: {file_path}")
                time.sleep(0.5)
            else:
                logging.warning(f"Could not cleanup file after {max_retries} attempts: {file_path} - {e}")
        except Exception as e:
            logging.warning(f"Unexpected cleanup error for {file_path}: {e}")
            return

@router.post("/upload-knowledge-file")
async def upload_knowledge_file(file: UploadFile = File(...)):
    """
    Uploads a file to OpenAI storage and attaches it to the vector store for retrieval using the REST API.
    Accepts any file type supported by OpenAI (pdf, docx, txt, etc.).
    Checks for duplicates based on filename and size.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")
    if not OPENAI_API_KEY or not VECTOR_STORE_ID:
        raise HTTPException(status_code=500, detail="OpenAI API key or Vector Store ID not configured.")
    try:
        # Save file temporarily to check size
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, file.filename)
        file_content = await file.read()
        with open(temp_path, "wb") as f_out:
            f_out.write(file_content)
        
        # Get file size
        file_size = len(file_content)
        
        # Check for duplicates
        duplicate_file = check_duplicate_file(file.filename, file_size)
        if duplicate_file:
            safe_cleanup_error(temp_path)
            return JSONResponse(content={
                "message": f"File '{file.filename}' already exists in knowledge base (uploaded on {duplicate_file['created_at']}). Upload skipped.",
                "duplicate": True,
                "existing_file": duplicate_file
            })
        
        # Check if file is Excel and convert to PDF if needed
        upload_file_path = temp_path
        converted_file = False
        
        if is_excel_file(file.filename):
            try:
                logging.info(f"Converting Excel file {file.filename} to PDF for knowledge base")
                pdf_path = convert_excel_for_knowledge_base(temp_path, temp_dir)
                upload_file_path = pdf_path
                converted_file = True
                logging.info(f"Successfully converted {file.filename} to PDF")
                
                # Give a small delay to ensure file handles are released
                time.sleep(0.1)
                
            except Exception as e:
                logging.warning(f"Failed to convert Excel to PDF: {e}. Uploading original file.")
                # Fall back to uploading original Excel file
                upload_file_path = temp_path
                converted_file = False
        
        # Check for duplicates before upload
        file_size = os.path.getsize(upload_file_path)
        duplicate_info = check_duplicate_file(file.filename, file_size)
        if duplicate_info:
            raise HTTPException(status_code=400, detail=f"Duplicate file detected: {duplicate_info['filename']} (ID: {duplicate_info['id']})")
        
        # 1. Upload file to OpenAI storage
        url = "https://api.openai.com/v1/files"
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        with open(upload_file_path, "rb") as f_in:
            files = {"file": f_in, "purpose": (None, "assistants")}
            resp = requests.post(url, headers=headers, files=files)
        
        if resp.status_code != 200:
            # Cleanup before raising exception
            safe_cleanup_error(temp_path)
            if converted_file and upload_file_path != temp_path:
                safe_cleanup_error(upload_file_path)
            raise HTTPException(status_code=500, detail=f"OpenAI file upload failed: {resp.text}")
        
        file_id = resp.json()["id"]
        
        # 2. Attach file to vector store
        url2 = f"https://api.openai.com/v1/vector_stores/{VECTOR_STORE_ID}/files"
        data = {"file_id": file_id}
        resp2 = requests.post(url2, headers=headers, json=data)
        
        if resp2.status_code != 200:
            # Cleanup before raising exception
            safe_cleanup_error(temp_path)
            if converted_file and upload_file_path != temp_path:
                safe_cleanup_error(upload_file_path)
            raise HTTPException(status_code=500, detail=f"OpenAI vector store attach failed: {resp2.text}")
        
        # Cleanup temporary files after successful upload
        safe_cleanup_with_retry(temp_path)
        if converted_file and upload_file_path != temp_path:
            safe_cleanup_with_retry(upload_file_path)
        
        response_message = "File uploaded and attached to vector store via REST API."
        if converted_file:
            response_message += " (Excel file was converted to PDF for better knowledge base compatibility.)"
        
        return JSONResponse(content={
            "message": response_message,
            "file_id": file_id,
            "vector_store_id": VECTOR_STORE_ID,
            "converted_to_pdf": converted_file
        })
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Cleanup on any unexpected error
        try:
            if 'temp_path' in locals():
                safe_cleanup_error(temp_path)
            if 'upload_file_path' in locals() and upload_file_path != temp_path:
                safe_cleanup_error(upload_file_path)
        except:
            pass
        
        logging.error(f"Unexpected error in upload_knowledge_file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/upload-website-content")
async def upload_website_content(payload: dict):
    """
    Crawls up to `max_pages` from the given URL's domain, aggregates main text, and uploads to OpenAI vector store.
    """
    url = payload.get("url")
    max_pages = payload.get("max_pages", 10)
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")
    if not OPENAI_API_KEY or not VECTOR_STORE_ID:
        raise HTTPException(status_code=500, detail="OpenAI API key or Vector Store ID not configured.")
    
    try:
        # Crawl the website
        logging.info(f"Starting website crawl for {url}, max_pages={max_pages}")
        all_links = crawl_static_links(url, max_pages=max_pages)
        
        if not all_links:
            raise HTTPException(status_code=400, detail="No content found at the provided URL")
        
        # Aggregate all page content
        full_content = ""
        for page_url in all_links:
            try:
                # Fetch content from each URL
                logging.info(f"Fetching content from {page_url}")
                response = requests.get(page_url, timeout=15, headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; Knowledge-Bot/1.0)'
                })
                if response.status_code == 200:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(response.text, "html.parser")
                    
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.decompose()
                    
                    # Get text content
                    page_content = soup.get_text()
                    
                    # Clean up whitespace
                    lines = (line.strip() for line in page_content.splitlines())
                    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                    page_content = ' '.join(chunk for chunk in chunks if chunk)
                    
                    if page_content.strip():
                        full_content += f"\n\n--- Content from {page_url} ---\n{page_content}"
                else:
                    logging.warning(f"Failed to fetch {page_url}: HTTP {response.status_code}")
            except Exception as e:
                logging.error(f"Error fetching content from {page_url}: {str(e)}")
                continue
        
        # Check if we got any content
        if not full_content.strip():
            raise HTTPException(status_code=400, detail="No readable content found from the crawled pages")
        
        # Create a temporary text file
        temp_dir = tempfile.gettempdir()
        temp_filename = f"website_content_{int(time.time())}.txt"
        temp_path = os.path.join(temp_dir, temp_filename)
        
        with open(temp_path, "w", encoding="utf-8") as f:
            f.write(full_content)
        
        # Upload to OpenAI
        url_upload = "https://api.openai.com/v1/files"
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        with open(temp_path, "rb") as f_in:
            files = {"file": f_in, "purpose": (None, "assistants")}
            resp = requests.post(url_upload, headers=headers, files=files)
        
        if resp.status_code != 200:
            safe_cleanup_error(temp_path)
            raise HTTPException(status_code=500, detail=f"OpenAI file upload failed: {resp.text}")
        
        file_id = resp.json()["id"]
        
        # Attach to vector store
        url_attach = f"https://api.openai.com/v1/vector_stores/{VECTOR_STORE_ID}/files"
        data = {"file_id": file_id}
        resp2 = requests.post(url_attach, headers=headers, json=data)
        
        if resp2.status_code != 200:
            safe_cleanup_error(temp_path)
            raise HTTPException(status_code=500, detail=f"OpenAI vector store attach failed: {resp2.text}")
        
        # Cleanup
        safe_cleanup_with_retry(temp_path)
        
        return JSONResponse(content={
            "message": f"Successfully crawled and uploaded content from {len(all_links)} pages",
            "file_id": file_id,
            "vector_store_id": VECTOR_STORE_ID,
            "pages_crawled": len(all_links),
            "source_url": url
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Website upload failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Website upload failed: {str(e)}")

@router.get("/knowledge-files")
async def get_knowledge_files():
    """
    Returns a list of all files currently in the knowledge base vector store.
    """
    try:
        files = get_vector_store_files()
        # Sort by creation date (newest first)
        files.sort(key=lambda x: x.get('created_at', 0), reverse=True)
        return JSONResponse(content={
            "files": files,
            "total": len(files)
        })
    except Exception as e:
        logging.error(f"Failed to get knowledge files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get knowledge files: {str(e)}")

@router.delete("/knowledge-files/{file_id}")
async def delete_knowledge_file(file_id: str):
    """
    Deletes a file from the knowledge base vector store.
    """
    try:
        success = delete_file_from_vector_store(file_id)
        if success:
            return JSONResponse(content={
                "message": "File deleted successfully",
                "file_id": file_id
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to delete file")
    except Exception as e:
        logging.error(f"Failed to delete file {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
