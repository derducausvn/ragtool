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

TEMP_DOWNLOAD_DIR = 'temp_downloads'

def load_urls_from_gdrive(file_name="sync_urls.txt") -> tuple[list[str], list[str]]:
    """Load STATIC and DYNAMIC URLs from a Google Drive file."""
    try:
        files = list_google_drive_files(os.getenv("GOOGLE_DRIVE_FOLDER_ID"))
        match = next((f for f in files if f["name"] == file_name), None)
        if not match:
            raise FileNotFoundError(f"{file_name} not found in Google Drive folder")

        local_path = download_google_drive_file(match["id"], match["name"], save_dir=TEMP_DOWNLOAD_DIR)
        static_urls = []
        dynamic_urls = []

        with open(local_path, 'r') as f:
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
        print(f"[sync_knowledge] Failed to load sync_urls.txt from GDrive: {e}")
        return [], []

os.makedirs(TEMP_DOWNLOAD_DIR, exist_ok=True)

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
    # -------- Load URL sync list from Google Drive --------
    static_urls, dynamic_urls = load_urls_from_gdrive()
    processed_ids = get_processed_ids()
    all_docs = []
    skipped_files = []

    # -------- Google Drive folder sync --------
    try:
        files = list_google_drive_files(os.getenv("GOOGLE_DRIVE_FOLDER_ID"))
        print(f"[sync_knowledge] Found {len(files)} files in Google Drive folder")

        for file in files:
            path = file["name"]
            try:
                local_path = download_google_drive_file(file["id"], path, save_dir=TEMP_DOWNLOAD_DIR)

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
                print(f"[sync_knowledge] Embedded {len(docs)} docs from GoogleDrive file: {path}")
            except Exception as e:
                print(f"[sync_knowledge] Failed to process {path}: {e}")
                skipped_files.append(path)
    except Exception as e:
        print(f"[sync_knowledge] GDrive sync failed: {e}")


    # -------- Web crawling --------
    web_docs = []
    for site in dynamic_urls:
        try:
            print(f"[sync_knowledge] Crawling dynamic site: {site}")
            urls = crawl_static_links(site, max_pages=MAX_WEB_PAGES)
            new_urls = []
            for u in urls:
                try:
                    res = requests.get(u, timeout=10)
                    if res.status_code != 200:
                        continue
                    content_hash = hash_content(res.text)
                    identifier = f"{u}:{content_hash}"  # include content
                    if identifier not in processed_ids:
                        new_urls.append((u, identifier))
                except Exception:
                    continue

            if not new_urls:
                continue

            loader = WebBaseLoader([u for u, _ in new_urls])
            docs = loader.load()
            for doc, (_, identifier) in zip(docs, new_urls):
                doc.metadata["source"] = doc.metadata.get("source", "")
                add_processed_id(identifier)

            docs = chunk_documents(docs)
            web_docs.extend(docs)
            print(f"[sync_knowledge] Embedded {len(docs)} web documents from {site}")
        except Exception as e:
            print(f"[sync_knowledge] Web crawl error for {site}: {e}")

    # -------- Static Help Pages --------
    static_docs = []
    for url in static_urls:
        try:
            res = requests.get(url, timeout=10)
            if res.status_code != 200:
                continue
            content_hash = hash_content(res.text)
            identifier = f"{url}:{content_hash}"

            if identifier in processed_ids:
                print(f"[sync_knowledge] Skipping already processed static page: {url}")
                continue

            loader = WebBaseLoader([url])
            docs = loader.load()
            for doc in docs:
                doc.metadata["source"] = url
            docs = chunk_documents(docs)

            static_docs.extend(docs)
            add_processed_id(identifier)
            print(f"[sync_knowledge] Embedded {len(docs)} static documents from {url}")

        except Exception as e:
            print(f"[sync_knowledge] Failed to process static help page {url}: {e}")

    all_docs.extend(web_docs)
    all_docs.extend(static_docs)
    embedded_count = embed_documents(all_docs)

    return {
        "documents_embedded": embedded_count,
        "files_skipped": skipped_files,
        "web_pages_embedded": len(web_docs)
    }

