"""
sync_knowledge.py (Refactored)
------------------------------
Main syncing logic for ingesting documents from Google Drive and web URLs.
Split into modular parts for easier maintenance, migration, and debugging.
Future-ready for OneDrive/SharePoint/Graph API plug-in.
"""

import os
import hashlib
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from parser import parse_file
from embedding import embed_documents
from google_drive_api import list_google_drive_files, download_google_drive_file

TEMP_DOWNLOAD_DIR = "temp_downloads"
PROCESSED_TRACK_FILE = "processed_items.txt"
MAX_WEB_PAGES = 25

os.makedirs(TEMP_DOWNLOAD_DIR, exist_ok=True)

def load_sync_urls(file_name="sync_urls.txt") -> tuple[list[str], list[str]]:
    """
    Load and separate STATIC / DYNAMIC URLs from a Drive-hosted sync_urls.txt file.
    Format: STATIC:... / DYNAMIC:... / plain URLs (default to static)
    """
    try:
        files = list_google_drive_files(os.getenv("GOOGLE_DRIVE_FOLDER_ID"))
        match = next((f for f in files if f["name"] == file_name), None)
        if not match:
            raise FileNotFoundError(f"{file_name} not found in Drive folder")

        local_path = download_google_drive_file(match["id"], match["name"], save_dir=TEMP_DOWNLOAD_DIR)
        static_urls, dynamic_urls = [], []

        with open(local_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("STATIC:"):
                    static_urls.append(line.replace("STATIC:", "").strip())
                elif line.startswith("DYNAMIC:"):
                    dynamic_urls.append(line.replace("DYNAMIC:", "").strip())
                else:
                    static_urls.append(line)

        return static_urls, dynamic_urls
    except Exception as e:
        print(f"[sync_knowledge] Failed to load sync_urls.txt: {e}")
        return [], []

def get_processed_ids() -> set:
    if not os.path.exists(PROCESSED_TRACK_FILE):
        return set()
    with open(PROCESSED_TRACK_FILE, "r") as f:
        return set(line.strip() for line in f.readlines())

def add_processed_id(identifier: str):
    with open(PROCESSED_TRACK_FILE, "a") as f:
        f.write(identifier + "\n")

def hash_content(content: str) -> str:
    return hashlib.md5(content.encode("utf-8")).hexdigest()

def chunk_documents(documents, chunk_size=1000, chunk_overlap=150):
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return splitter.split_documents(documents)

def crawl_static_links(base_url: str, max_pages: int = MAX_WEB_PAGES) -> list:
    """Recursively crawl a domain and return a list of same-domain subpages."""
    visited = set()
    to_visit = [base_url]
    results = []
    domain = urlparse(base_url).netloc

    while to_visit and len(visited) < max_pages:
        url = to_visit.pop(0)
        if url in visited:
            continue

        try:
            res = requests.get(url, timeout=10)
            if res.status_code != 200:
                continue

            visited.add(url)
            results.append(url)
            soup = BeautifulSoup(res.text, "html.parser")

            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.startswith(("#", "mailto:", "javascript:")):
                    continue
                full_url = urljoin(url, href)
                if urlparse(full_url).netloc == domain and full_url not in visited and full_url not in to_visit:
                    to_visit.append(full_url)
        except Exception:
            continue

    return results[:max_pages]

def sync_knowledge():
    static_urls, dynamic_urls = load_sync_urls()
    processed_ids = get_processed_ids()
    all_docs, skipped_files, web_docs = [], [], []

    # --- Google Drive File Sync ---
    try:
        files = list_google_drive_files(os.getenv("GOOGLE_DRIVE_FOLDER_ID"))
        print(f"[sync] {len(files)} files found in Google Drive")

        for file in files:
            name = file["name"]
            try:
                path = download_google_drive_file(file["id"], name, save_dir=TEMP_DOWNLOAD_DIR)
                with open(path, "rb") as f:
                    content_hash = hashlib.md5(f.read()).hexdigest()
                identifier = f"{name}:{content_hash}"
                if identifier in processed_ids:
                    print(f"[sync] Skipped (unchanged): {name}")
                    continue

                docs = parse_file(path)
                for doc in docs:
                    doc.metadata["source"] = name
                all_docs.extend(docs)
                add_processed_id(identifier)
                print(f"[sync] Embedded {len(docs)} docs from: {name}")

            except Exception as e:
                print(f"[sync] Failed to process {name}: {e}")
                skipped_files.append(name)
    except Exception as e:
        print(f"[sync] GDrive sync error: {e}")

    # --- Dynamic Web Pages ---
    for root_url in dynamic_urls:
        try:
            print(f"[sync] Crawling site: {root_url}")
            urls = crawl_static_links(root_url, max_pages=MAX_WEB_PAGES)
            new_urls = []
            for url in urls:
                try:
                    res = requests.get(url, timeout=10)
                    if res.status_code != 200:
                        continue
                    identifier = f"{url}:{hash_content(res.text)}"
                    if identifier not in processed_ids:
                        new_urls.append((url, identifier))
                except Exception:
                    continue

            if not new_urls:
                continue

            loader = WebBaseLoader([u for u, _ in new_urls])
            docs = loader.load()
            for doc, (_, ident) in zip(docs, new_urls):
                doc.metadata["source"] = doc.metadata.get("source", "")
                add_processed_id(ident)

            docs = chunk_documents(docs)
            web_docs.extend(docs)
            print(f"[sync] Embedded {len(docs)} web docs from {root_url}")
        except Exception as e:
            print(f"[sync] Web crawl error @ {root_url}: {e}")

    # --- Static Help Pages ---
    static_docs = []
    for url in static_urls:
        try:
            res = requests.get(url, timeout=10)
            if res.status_code != 200:
                continue
            identifier = f"{url}:{hash_content(res.text)}"
            if identifier in processed_ids:
                print(f"[sync] Skipped static page (cached): {url}")
                continue

            loader = WebBaseLoader([url])
            docs = loader.load()
            for doc in docs:
                doc.metadata["source"] = url
            docs = chunk_documents(docs)
            static_docs.extend(docs)
            add_processed_id(identifier)
            print(f"[sync] Embedded {len(docs)} static docs from {url}")
        except Exception as e:
            print(f"[sync] Static sync error @ {url}: {e}")

    # --- Final embedding ---
    all_docs.extend(web_docs)
    all_docs.extend(static_docs)
    embedded_count = embed_documents(all_docs)

    return {
        "documents_embedded": embedded_count,
        "files_skipped": skipped_files,
        "web_pages_embedded": len(web_docs)
    }

# --- PLACEHOLDER ---
# Add support for Microsoft Graph API:
# from microsoft_graph_api import list_onedrive_files, download_onedrive_file
# Replace Google Drive sync with OneDrive/SharePoint option