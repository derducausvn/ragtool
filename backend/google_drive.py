import os
import json
import io
from typing import List
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

SCOPES = ['https://www.googleapis.com/auth/drive']
TEMP_DOWNLOAD_DIR = 'temp_downloads'
os.makedirs(TEMP_DOWNLOAD_DIR, exist_ok=True)


def get_drive_service():
    creds_json = os.getenv("GOOGLE_CLOUD_CREDENTIALS")
    if not creds_json:
        raise RuntimeError("Missing GOOGLE_CLOUD_CREDENTIALS environment variable")

    creds_dict = json.loads(creds_json)
    # Fix newline in private key
    if "private_key" in creds_dict:
        creds_dict["private_key"] = creds_dict["private_key"].replace('\\n', '\n')

    creds = service_account.Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    return build('drive', 'v3', credentials=creds)


def list_files_in_folder(service, folder_id: str) -> List[dict]:
    results = service.files().list(
        q=f"'{folder_id}' in parents",
        pageSize=100,
        fields="files(id, name, mimeType, modifiedTime)"
    ).execute()
    return results.get('files', [])


def download_file(service, file_id: str, filename: str) -> str:
    request = service.files().get_media(fileId=file_id)
    file_path = os.path.join(TEMP_DOWNLOAD_DIR, filename)

    with open(file_path, 'wb') as fh:
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()

    return file_path
