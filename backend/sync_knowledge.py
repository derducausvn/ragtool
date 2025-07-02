import os
import io
import json
import hashlib
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

from google.oauth2 import service_account
from langchain_community.document_loaders import WebBaseLoader
from googleapiclient.http import MediaIoBaseDownload
from googleapiclient.discovery import build

from parser import parse_file
from embedding import embed_documents
from google_auth import authenticate
from langchain.text_splitter import RecursiveCharacterTextSplitter

TEMP_DOWNLOAD_DIR = 'temp_downloads'
os.makedirs(TEMP_DOWNLOAD_DIR, exist_ok=True)

HELP_SITES = [
    "https://f24.com/en/",
    "https://helpplus.fact24.com/l/en"
]

MAX_WEB_PAGES = 50
PROCESSED_TRACK_FILE = 'processed_items.txt'

def chunk_documents(documents, chunk_size=1000, chunk_overlap=150):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    return splitter.split_documents(documents)

def get_processed_ids():
    if not os.path.exists(PROCESSED_TRACK_FILE):
        return set()
    with open(PROCESSED_TRACK_FILE, 'r') as f:
        return set(line.strip() for line in f.readlines())

def add_processed_id(identifier: str):
    with open(PROCESSED_TRACK_FILE, 'a') as f:
        f.write(identifier + '\n')

def hash_content(content: str) -> str:
    return hashlib.md5(content.encode('utf-8')).hexdigest()

def crawl_static_links(base_url, max_pages=MAX_WEB_PAGES):
    visited = set()
    to_visit = [base_url]
    all_links = []
    base_domain = urlparse(base_url).netloc

    while to_visit and len(visited) < max_pages:
        url = to_visit.pop(0)
        if url in visited:
            continue

        try:
            res = requests.get(url, timeout=10)
            if res.status_code != 200:
                continue

            soup = BeautifulSoup(res.text, 'html.parser')
            visited.add(url)
            all_links.append(url)

            for a in soup.find_all('a', href=True):
                href = a['href']
                if not href or href.startswith(("#", "mailto:", "javascript:")):
                    continue

                full_url = urljoin(url, href)
                parsed = urlparse(full_url)
                if parsed.netloc != base_domain:
                    continue

                if full_url not in visited and full_url not in to_visit:
                    to_visit.append(full_url)

        except Exception:
            continue

    return list(set(all_links))[:max_pages]

def sync_knowledge():
    creds = authenticate()
    if not creds or not creds.valid:
        return {"error": "Google credentials invalid or missing. Please authenticate first."}

    try:
        service = build('drive', 'v3', credentials=creds)
        results = service.files().list(
            pageSize=100,
            fields="files(id, name, mimeType, modifiedTime)"
        ).execute()
    except Exception as e:
        print(f"[sync_knowledge] Google Drive API error: {e}")
        return {"error": "Failed to connect to Google Drive API. Check your internet or firewall."}

    files = results.get('files', [])
    new_docs = []
    skipped_files = []
    processed_ids = get_processed_ids()

    for file in files:
        file_id = file['id']
        file_name = file['name']
        file_path = os.path.join(TEMP_DOWNLOAD_DIR, file_name)

        if file_id in processed_ids:
            continue

        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except PermissionError:
            print(f"[sync_knowledge] Skipping locked file: {file_name}")
            skipped_files.append(file_name)
            continue

        try:
            request = service.files().get_media(fileId=file_id)
            with open(file_path, 'wb') as fh:
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                while not done:
                    status, done = downloader.next_chunk()
        except Exception as e:
            print(f"[sync_knowledge] Failed to download {file_name}: {e}")
            skipped_files.append(file_name)
            continue

        try:
            docs = parse_file(file_path)
            for doc in docs:
                doc.metadata["source"] = file_path
            new_docs.extend(docs)
            add_processed_id(file_id)
        except Exception as e:
            print(f"[sync_knowledge] Error parsing {file_name}: {e}")
            skipped_files.append(file_name)
            continue

    web_docs = []
    for site in HELP_SITES:
        print(f"[sync_knowledge] Crawling website: {site}")
        try:
            urls = crawl_static_links(site, max_pages=MAX_WEB_PAGES)
            print(f"[sync_knowledge] Found {len(urls)} total URLs on {site}")

            urls = [u for u in urls if hash_content(u) not in processed_ids]
            print(f"[sync_knowledge] {len(urls)} new URLs will be loaded from {site}")

            loader = WebBaseLoader(urls)
            docs = loader.load()
            for doc in docs:
                doc.metadata["source"] = doc.metadata.get("source", "")
                add_processed_id(hash_content(doc.metadata["source"]))

            docs = chunk_documents(docs)
            web_docs.extend(docs)
            print(f"[sync_knowledge] Embedded {len(docs)} docs from {site}")

        except Exception as e:
            print(f"[sync_knowledge] Failed to crawl {site}: {e}")

    all_docs = new_docs + web_docs
    embedded_count = embed_documents(all_docs)

    return {
        "files_processed": len(files),
        "documents_embedded": embedded_count,
        "files_skipped": skipped_files,
        "web_pages_embedded": len(web_docs)
    }
