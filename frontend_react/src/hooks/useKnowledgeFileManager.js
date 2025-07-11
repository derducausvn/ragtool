import { useState, useCallback } from 'react';

const useKnowledgeFileManager = (API_BASE) => {
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  
  const handleDeleteKnowledgeFile = useCallback(async (fileId, filename, onSuccess, onError) => {
    setFileToDelete({ id: fileId, filename });
  }, []);

  const confirmDeleteKnowledgeFile = useCallback(async (onSuccess, onError) => {
    if (!fileToDelete) return;
    
    setIsDeletingFile(true);
    try {
      const res = await fetch(`${API_BASE}/knowledge-files/${fileToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        onSuccess?.(`"${fileToDelete.filename}" deleted successfully.`);
      } else {
        throw new Error(`Delete failed: ${res.statusText}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      onError?.(`Failed to delete "${fileToDelete.filename}": ${err.message}`);
    } finally {
      setIsDeletingFile(false);
      setFileToDelete(null);
    }
  }, [fileToDelete, API_BASE]);

  const cancelDeleteKnowledgeFile = useCallback(() => {
    setFileToDelete(null);
  }, []);

  return {
    fileToDelete,
    isDeletingFile,
    handleDeleteKnowledgeFile,
    confirmDeleteKnowledgeFile,
    cancelDeleteKnowledgeFile
  };
};

export default useKnowledgeFileManager;
