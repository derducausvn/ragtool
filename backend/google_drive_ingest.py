import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Use readonly scope or add write if you want to upload files
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

# Either read JSON from env var or from file path here:
GOOGLE_CLOUD_CREDENTIALS = os.getenv("GOOGLE_CLOUD_CREDENTIALS")

def authenticate():
    if not GOOGLE_CLOUD_CREDENTIALS:
        raise RuntimeError("Missing GOOGLE_CLOUD_CREDENTIALS environment variable")

    info = json.loads(GOOGLE_CLOUD_CREDENTIALS)
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    return creds

def list_files(service, folder_id=None):
    query = f"'{folder_id}' in parents" if folder_id else None
    results = service.files().list(
        q=query,
        pageSize=10,
        fields="nextPageToken, files(id, name, mimeType)"
    ).execute()
    items = results.get('files', [])
    if not items:
        print('No files found.')
    else:
        print("Files:")
        for item in items:
            print(f"{item['name']} ({item['id']})")

def main():
    creds = authenticate()
    service = build('drive', 'v3', credentials=creds)

    # List files in root folder
    list_files(service)

if __name__ == '__main__':
    main()
