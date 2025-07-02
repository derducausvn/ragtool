import os
import json
from google.oauth2 import service_account

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def authenticate():
    creds_json = os.getenv("GOOGLE_CLOUD_CREDENTIALS")
    print(f"DEBUG: creds_json={creds_json}")  # Add this line to log what is read
    if not creds_json:
        raise RuntimeError("Missing GOOGLE_CLOUD_CREDENTIALS environment variable")

    info = json.loads(creds_json)
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    return creds
