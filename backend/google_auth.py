import os
import json
from google.oauth2 import service_account

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def authenticate():
    creds_json = os.getenv("GOOGLE_CLOUD_CREDENTIALS")
    if not creds_json:
        raise RuntimeError("Missing GOOGLE_CLOUD_CREDENTIALS environment variable")

    info = json.loads(creds_json)
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    return creds
