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

def crawl_static_links(base_url: str, max_pages: int = MAX_WEB_PAGES) -> list:
    """Recursively crawl a domain and return a list of same-domain subpages with timeout protection."""
    visited = set()
    to_visit = [base_url]
    results = []
    domain = urlparse(base_url).netloc
    start_time = __import__('time').time()
    MAX_CRAWL_TIME = 120  # 2 minutes max per domain

    print(f"[sync] Starting crawl of {domain} (max {max_pages} pages, {MAX_CRAWL_TIME}s timeout)")

    while to_visit and len(visited) < max_pages:
        # Check timeout
        if __import__('time').time() - start_time > MAX_CRAWL_TIME:
            print(f"[sync] ⚠️  Crawl timeout for {domain} after {MAX_CRAWL_TIME}s - returning {len(results)} pages")
            break

        url = to_visit.pop(0)
        if url in visited:
            continue

        try:
            print(f"[sync] Crawling page {len(visited)+1}/{max_pages}: {url}")
            res = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; Knowledge-Bot/1.0)'
            })
            if res.status_code != 200:
                print(f"[sync] ⚠️  HTTP {res.status_code} for {url}")
                continue

            visited.add(url)
            results.append(url)
            
            # Only parse HTML for additional links if we haven't hit our limit
            if len(visited) < max_pages:
                soup = BeautifulSoup(res.text, "html.parser")
                new_links = 0
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if href.startswith(("#", "mailto:", "javascript:")):
                        continue
                    full_url = urljoin(url, href)
                    if urlparse(full_url).netloc == domain and full_url not in visited and full_url not in to_visit:
                        to_visit.append(full_url)
                        new_links += 1
                        if len(to_visit) > max_pages * 2:  # Prevent queue explosion
                            break
                
                if new_links > 0:
                    print(f"[sync] Found {new_links} new links from {url}")

        except requests.exceptions.Timeout:
            print(f"[sync] ⏱️  Timeout crawling {url} - skipping")
            continue
        except Exception as e:
            print(f"[sync] ⚠️  Error crawling {url}: {e}")
            continue

    elapsed = round(__import__('time').time() - start_time, 1)
    print(f"[sync] Crawl complete for {domain}: {len(results)} pages in {elapsed}s")
    return results[:max_pages]

def sync_knowledge():
    """
    Main sync function with detailed progress logging for long-running operations.
    """
    print("[sync] === KNOWLEDGE SYNC STARTED ===")
    start_time = __import__('time').time()
    
    static_urls, dynamic_urls = load_sync_urls()
    processed_ids = get_processed_ids()
    all_docs, skipped_files, web_docs = [], [], []

    # --- Google Drive File Sync ---
    print("[sync] === PHASE 1: Google Drive Files ===")
    try:
        files = list_google_drive_files(os.getenv("GOOGLE_DRIVE_FOLDER_ID"))
        print(f"[sync] Found {len(files)} files in Google Drive")

        for i, file in enumerate(files, 1):
            name = file["name"]
            print(f"[sync] Processing file {i}/{len(files)}: {name}")
            try:
                path = download_google_drive_file(file["id"], name, save_dir=TEMP_DOWNLOAD_DIR)
                with open(path, "rb") as f:
                    content_hash = hashlib.md5(f.read()).hexdigest()
                identifier = f"{name}:{content_hash}"
                if identifier in processed_ids:
                    print(f"[sync] ✓ Skipped (unchanged): {name}")
                    continue

                docs = parse_file(path)
                for doc in docs:
                    doc.metadata["source"] = name
                all_docs.extend(docs)
                add_processed_id(identifier)
                print(f"[sync] ✓ Processed {len(docs)} docs from: {name}")

            except Exception as e:
                print(f"[sync] ✗ Failed to process {name}: {e}")
                skipped_files.append(name)
        
        print(f"[sync] Google Drive phase complete: {len(all_docs)} documents processed")
    except Exception as e:
        print(f"[sync] ✗ GDrive sync error: {e}")

    # --- Dynamic Web Pages ---
    print(f"[sync] === PHASE 2: Dynamic Websites ({len(dynamic_urls)} sites) ===")
    phase_start = __import__('time').time()
    MAX_PHASE_TIME = 300  # 5 minutes max for all dynamic websites
    
    for i, root_url in enumerate(dynamic_urls, 1):
        # Check if we've exceeded the phase timeout
        if __import__('time').time() - phase_start > MAX_PHASE_TIME:
            print(f"[sync] ⚠️  Phase 2 timeout ({MAX_PHASE_TIME}s) - skipping remaining sites")
            break
            
        try:
            print(f"[sync] Crawling site {i}/{len(dynamic_urls)}: {root_url}")
            site_start = __import__('time').time()
            
            urls = crawl_static_links(root_url, max_pages=MAX_WEB_PAGES)
            print(f"[sync] Found {len(urls)} pages to check for new content")
            
            new_urls = []
            for j, url in enumerate(urls):
                try:
                    print(f"[sync] Checking page {j+1}/{len(urls)}: {url[:60]}...")
                    res = requests.get(url, timeout=15, headers={
                        'User-Agent': 'Mozilla/5.0 (compatible; Knowledge-Bot/1.0)'
                    })
                    if res.status_code != 200:
                        print(f"[sync] ⚠️  HTTP {res.status_code} for {url}")
                        continue
                    identifier = f"{url}:{hash_content(res.text)}"
                    if identifier not in processed_ids:
                        new_urls.append((url, identifier))
                        print(f"[sync] ✓ New content found")
                    else:
                        print(f"[sync] - Content unchanged")
                except requests.exceptions.Timeout:
                    print(f"[sync] ⏱️  Timeout checking {url} - skipping")
                    continue
                except Exception as e:
                    print(f"[sync] ⚠️  Error checking {url}: {e}")
                    continue

            if not new_urls:
                print(f"[sync] ✓ No new content from {root_url}")
                continue

            print(f"[sync] Loading {len(new_urls)} new pages with LangChain...")
            try:
                loader = WebBaseLoader([u for u, _ in new_urls])
                docs = loader.load()
                for doc, (_, ident) in zip(docs, new_urls):
                    doc.metadata["source"] = doc.metadata.get("source", "")
                    add_processed_id(ident)

                web_docs.extend(docs)
                site_time = round(__import__('time').time() - site_start, 1)
                print(f"[sync] ✅ Processed {len(docs)} web docs from {root_url} in {site_time}s")
            except Exception as loader_error:
                print(f"[sync] ⚠️  WebBaseLoader error for {root_url}: {loader_error}")
                continue
                
        except Exception as e:
            print(f"[sync] ✗ Web crawl error @ {root_url}: {e}")

    phase_time = round(__import__('time').time() - phase_start, 1)
    print(f"[sync] Dynamic websites phase complete: {len(web_docs)} documents processed in {phase_time}s")

    # --- Static Help Pages ---
    print(f"[sync] === PHASE 3: Static URLs ({len(static_urls)} URLs) ===")
    static_docs = []
    for i, url in enumerate(static_urls, 1):
        try:
            print(f"[sync] Processing URL {i}/{len(static_urls)}: {url}")
            res = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; Knowledge-Bot/1.0)'
            })
            if res.status_code != 200:
                print(f"[sync] ✗ HTTP {res.status_code} for {url}")
                continue
            identifier = f"{url}:{hash_content(res.text)}"
            if identifier in processed_ids:
                print(f"[sync] ✓ Skipped static page (cached): {url}")
                continue

            loader = WebBaseLoader([url])
            docs = loader.load()
            for doc in docs:
                doc.metadata["source"] = url
            static_docs.extend(docs)
            add_processed_id(identifier)
            print(f"[sync] ✓ Processed {len(docs)} static docs from {url}")
        except Exception as e:
            print(f"[sync] ✗ Static sync error @ {url}: {e}")

    print(f"[sync] Static URLs phase complete: {len(static_docs)} documents processed")

    # --- Final embedding ---
    print("[sync] === PHASE 4: EMBEDDING TO POSTGRESQL ===")
    all_docs.extend(web_docs)
    all_docs.extend(static_docs)

    embedded_count = 0
    if all_docs:
        print(f"[sync] Starting embedding of {len(all_docs)} total documents...")
        print("[sync] ⚠️  This may take several minutes for large document sets...")
        print("[sync] ⚠️  Generating embeddings via OpenAI API and storing in PostgreSQL...")
        embedded_count = embed_documents(all_docs)
        print(f"[sync] ✅ Successfully embedded {embedded_count} document chunks to PostgreSQL")
    else:
        print("[sync] ℹ️  No new documents to embed")
        embedded_count = 0

    # --- Summary ---
    end_time = __import__('time').time()
    duration = round(end_time - start_time, 2)

    # Count new docs per phase
    new_gdrive_docs = sum(1 for doc in all_docs if doc.metadata.get("source") and not doc.metadata.get("source", "").startswith("http"))
    new_web_docs = len(web_docs)
    new_static_docs = len(static_docs)

    print(f"[sync] === SYNC COMPLETE ===")
    print(f"[sync] ⏱️  Total time: {duration} seconds")
    print(f"[sync] 📊 Performance Summary:")
    print(f"[sync]    • Google Drive docs embedded: {new_gdrive_docs}")
    print(f"[sync]    • Dynamic web pages embedded: {new_web_docs}")
    print(f"[sync]    • Static URLs embedded: {new_static_docs}")
    print(f"[sync]    • Total documents embedded: {embedded_count}")
    print(f"[sync]    • Files skipped/failed: {len(skipped_files)}")
    if skipped_files:
        print(f"[sync]    • Failed files: {', '.join(skipped_files[:5])}{' ...' if len(skipped_files) > 5 else ''}")
    print(f"[sync] 🚀 Knowledge base ready for chat queries!")
    if embedded_count > 0:
        docs_per_second = round(embedded_count / duration, 1)
        print(f"[sync] 📈 Processing rate: {docs_per_second} docs/second")

    return {
        "documents_embedded": embedded_count,
        "files_skipped": skipped_files,
        "web_pages_embedded": new_web_docs,
        "duration_seconds": duration,
        "total_documents_processed": len(all_docs)
    }

# --- PLACEHOLDER ---
# Add support for Microsoft Graph API:
# from microsoft_graph_api import list_onedrive_files, download_onedrive_file
# Replace Google Drive sync with OneDrive/SharePoint option