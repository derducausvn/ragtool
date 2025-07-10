"""
web_utils.py
------------
Utility functions for crawling websites and tracking processed URLs for knowledge ingestion.
"""

import os
import hashlib
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

PROCESSED_TRACK_FILE = "processed_items.txt"
MAX_WEB_PAGES = 25

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

    print(f"[web_utils] Starting crawl of {domain} (max {max_pages} pages, {MAX_CRAWL_TIME}s timeout)")

    while to_visit and len(visited) < max_pages:
        # Check timeout
        if __import__('time').time() - start_time > MAX_CRAWL_TIME:
            print(f"[web_utils] ⚠️  Crawl timeout for {domain} after {MAX_CRAWL_TIME}s - returning {len(results)} pages")
            break

        url = to_visit.pop(0)
        if url in visited:
            continue

        try:
            print(f"[web_utils] Crawling page {len(visited)+1}/{max_pages}: {url}")
            res = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; Knowledge-Bot/1.0)'
            })
            if res.status_code != 200:
                print(f"[web_utils] ⚠️  HTTP {res.status_code} for {url}")
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
                    print(f"[web_utils] Found {new_links} new links from {url}")

        except requests.exceptions.Timeout:
            print(f"[web_utils] ⏱️  Timeout crawling {url} - skipping")
            continue
        except Exception as e:
            print(f"[web_utils] ⚠️  Error crawling {url}: {e}")
            continue

    elapsed = round(__import__('time').time() - start_time, 1)
    print(f"[web_utils] Crawl complete for {domain}: {len(results)} pages in {elapsed}s")
    return results[:max_pages]
