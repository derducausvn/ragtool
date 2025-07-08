
import os, json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io

# Path to your credentials file
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def get_drive_service():
    creds_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if not creds_json:
        raise RuntimeError("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON env var")
    
    # Parse the JSON
    creds_dict = json.loads(creds_json)

    # Fix: convert escaped \\n back to real newlines in private key
    if "private_key" in creds_dict:
        creds_dict["private_key"] = creds_dict["private_key"].replace("\\n", "\n")
    
    creds = service_account.Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    return build('drive', 'v3', credentials=creds)

def list_google_drive_files(folder_id):
    service = get_drive_service()
    files = []
    page_token = None
    while True:
        response = service.files().list(
            q=f"'{folder_id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false",
            spaces='drive',
            fields='nextPageToken, files(id, name)',
            pageToken=page_token
        ).execute()
        files.extend(response.get('files', []))
        page_token = response.get('nextPageToken', None)
        if page_token is None:
            break
    return files

def download_google_drive_file(file_id, file_name, save_dir='temp_downloads'):
    service = get_drive_service()
    request = service.files().get_media(fileId=file_id)
    os.makedirs(save_dir, exist_ok=True)
    file_path = os.path.join(save_dir, file_name)
    fh = io.FileIO(file_path, 'wb')
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        status, done = downloader.next_chunk()
    return file_path
