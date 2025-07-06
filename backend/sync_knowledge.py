import os
import hashlib
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

from parser import parse_file
from embedding import embed_documents
from dropbox_api import list_dropbox_files, download_dropbox_file

TEMP_DOWNLOAD_DIR = 'temp_downloads'
os.makedirs(TEMP_DOWNLOAD_DIR, exist_ok=True)

HELP_SITES = [
    "https://f24.com/en/",
    "https://helpplus.fact24.com/l/en"
]

DROPBOX_FOLDER = "/ragtool_knowledgesource"
MAX_WEB_PAGES = 25
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
    processed_ids = get_processed_ids()
    all_docs = []
    skipped_files = []

    # -------- Dropbox folder sync --------
    try:
        file_paths = list_dropbox_files(DROPBOX_FOLDER)
        print(f"[sync_knowledge] Found {len(file_paths)} files in Dropbox folder")
    
        for path in file_paths:
            try:
                local_path = download_dropbox_file(path, save_dir=TEMP_DOWNLOAD_DIR)
    
                with open(local_path, 'rb') as f:
                    content_hash = hashlib.md5(f.read()).hexdigest()
                identifier = f"{path}:{content_hash}"
    
                if identifier in processed_ids:
                    print(f"[sync_knowledge] Skipping already processed: {path}")
                    continue
    
                docs = parse_file(local_path)
                for doc in docs:
                    doc.metadata["source"] = path
                all_docs.extend(docs)
                add_processed_id(identifier)
                print(f"[sync_knowledge] Embedded {len(docs)} docs from Dropbox file: {path}")
            except Exception as e:
                print(f"[sync_knowledge] Failed to process {path}: {e}")
                skipped_files.append(path)
    except Exception as e:
        print(f"[sync_knowledge] Dropbox sync failed: {e}")

    # -------- Web crawling --------
    web_docs = []
    for site in HELP_SITES:
        try:
            urls = crawl_static_links(site, max_pages=MAX_WEB_PAGES)
            new_urls = [u for u in urls if hash_content(u) not in processed_ids]
            if not new_urls:
                continue

            loader = WebBaseLoader(new_urls)
            docs = loader.load()
            for doc in docs:
                doc.metadata["source"] = doc.metadata.get("source", "")
                add_processed_id(hash_content(doc.metadata["source"]))

            docs = chunk_documents(docs)
            web_docs.extend(docs)
            print(f"[sync_knowledge] Embedded {len(docs)} web documents from {site}")
        except Exception as e:
            print(f"[sync_knowledge] Web crawl error for {site}: {e}")

    all_docs.extend(web_docs)
    embedded_count = embed_documents(all_docs)

    return {
        "documents_embedded": embedded_count,
        "files_skipped": skipped_files,
        "web_pages_embedded": len(web_docs)
    }
