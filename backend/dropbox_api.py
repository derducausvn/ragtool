import os
import dropbox

ACCESS_TOKEN = os.getenv("DROPBOX_ACCESS_TOKEN")
TEMP_DIR = "/tmp"

def list_dropbox_files(folder_path="/ragtool_knowledgesource"):
    dbx = dropbox.Dropbox(ACCESS_TOKEN)
    files = []

    result = dbx.files_list_folder(folder_path)
    for entry in result.entries:
        if isinstance(entry, dropbox.files.FileMetadata):
            files.append(entry.path_lower)

    return files

def download_dropbox_file(path, save_dir=TEMP_DIR):
    dbx = dropbox.Dropbox(ACCESS_TOKEN)
    filename = os.path.basename(path)
    local_path = os.path.join(save_dir, filename)

    with open(local_path, "wb") as f:
        metadata, res = dbx.files_download(path)
        f.write(res.content)

    return local_path
