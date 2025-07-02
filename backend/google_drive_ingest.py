import os
import pickle
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying scopes, delete token.pickle to re-authenticate
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

# Compute absolute path to your credentials JSON in the project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDENTIALS_PATH = os.path.join(BASE_DIR, 'googlecloudcred.json')

def authenticate():
    creds = None
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=8080)

        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

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

    # To list all files in root folder:
    list_files(service)

    # Or specify folder ID to list files inside a folder:
    # list_files(service, folder_id="your-folder-id")

if __name__ == '__main__':
    main()
