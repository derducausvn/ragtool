const useApiHandlers = (API_BASE, state) => {
  const {
    setRenameInput, setMenuOpenId, setRenamingId, setDeleteModalOpen, setChatToDelete,
    setActiveSessionId, setChatHistory, setQuestionnaireResults, setFile, setActiveQuestionnaireId,
    setCurrentPage, setRenamingQuestionnaireId, setRenameQuestionnaireInput, setQuestionnaireToDelete,
    setChatList, setQuestionnaireList, setIsUploadingKnowledge, setKnowledgeUploadStatus,
    setKnowledgeFiles, setIsScanning, setWebsiteScanStatus, setCrawlProgress, setWebsiteUrl,
    setMaxPages, setIsLoadingFiles, setUploadedKnowledgeFiles, setBatchResults, setIsProcessing,
    setUserInput, setIsLoading, setChatHistory: setChatHistoryState
  } = state;

  // === CHAT & ASK FUNCTIONS ===
  const refreshChatList = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/history`);
      const data = await res.json();
      setChatList(data.history || []);
    } catch (err) {
      console.error("Failed to refresh chat list:", err);
    }
  };

  const handleSelectChat = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/chat/${sessionId}`);
      const data = await res.json();
      setChatHistory(data.history || []);
      setActiveSessionId(sessionId);
      setCurrentPage("chat");
    } catch (err) {
      console.error("Failed to load chat session:", err);
    }
  };

  const handleSendMessage = async (question, sessionId, mode, chatHistory) => {
    if (!question.trim()) return;

    setIsLoading(true);
    setUserInput('');

    const userMessage = { role: 'user', content: question };
    setChatHistoryState(prev => [...prev, userMessage]);

    try {
      // Create new session if none exists
      if (!sessionId) {
        const newSessionRes = await fetch(`${API_BASE}/chat/new`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: question.substring(0, 30) })
        });
        const newSessionData = await newSessionRes.json();
        sessionId = newSessionData.session_id;
        setActiveSessionId(sessionId);
      }

      let res, result;

      // Use the new clean endpoints
      if (mode === 'F24 QA Expert') {
        // F24 Expert mode: Use AI assistant with knowledge base
        res = await fetch(`${API_BASE}/chat/assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            question: question,
            session_id: sessionId 
          })
        });
        result = await res.json();
      } else {
        // General Chat mode: Use direct OpenAI GPT
        res = await fetch(`${API_BASE}/chat/general`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            question: question,
            session_id: sessionId 
          })
        });
        result = await res.json();
      }

      const reply = {
        role: 'assistant',
        content: result.answer || 'No answer returned.',
        sources: result.sources || []
      };
      setChatHistoryState(prev => [...prev, reply]);
      
      // Refresh chat list to show the new/updated session
      refreshChatList();
    } catch (err) {
      console.error('Error:', err);
      const errMsg = {
        role: 'assistant',
        content: 'Error fetching answer.',
        sources: []
      };
      setChatHistoryState(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // === QUESTIONNAIRE FUNCTIONS ===
  const refreshQuestionnaireList = async () => {
    try {
      const res = await fetch(`${API_BASE}/questionnaires/history`);
      const data = await res.json();
      setQuestionnaireList(data.history || []);
    } catch (err) {
      console.error("Failed to refresh questionnaire list:", err);
    }
  };

  const handleSelectQuestionnaire = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/questionnaires/${sessionId}`);
      const data = await res.json();
      setQuestionnaireResults(data.results || []);
      setFile({ name: data.file_name });
      setActiveQuestionnaireId(sessionId);
      setCurrentPage("questionnaire");
    } catch (err) {
      console.error("Failed to load questionnaire session:", err);
    }
  };

  const handleProcessFile = async (file, refreshQuestionnaireList) => {
    if (!file) return;

    // Clear old results before new request
    setQuestionnaireResults([]);
    setBatchResults([]);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use new clean endpoint
      const res = await fetch(`${API_BASE}/questionnaires/process`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      setQuestionnaireResults(data.questions_and_answers || []);
      setBatchResults(data.questions_and_answers || []);
      setActiveQuestionnaireId(data.session_id);
      setCurrentPage('questionnaire');
      refreshQuestionnaireList();
      setFile(file);
    } catch (err) {
      console.error("Processing error:", err);
      alert("An error occurred while processing the file.");
    } finally {
      setIsProcessing(false);
    }
  };

  // === KNOWLEDGE BASE FUNCTIONS ===
  const fetchKnowledgeFiles = async () => {
    if (state.isLoadingFiles) return;

    setIsLoadingFiles(true);
    try {
      // Use new clean endpoint
      const response = await fetch(`${API_BASE}/knowledge/files`);
      if (response.ok) {
        const data = await response.json();
        setUploadedKnowledgeFiles(data.files || []);
      } else {
        console.error('Failed to fetch knowledge files');
      }
    } catch (error) {
      console.error('Error fetching knowledge files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleKnowledgeFileSubmit = async (knowledgeFiles, fetchKnowledgeFiles) => {
    if (knowledgeFiles.length === 0) return;
    
    setIsUploadingKnowledge(true);
    setKnowledgeUploadStatus(null);
    
    try {
      const formData = new FormData();
      knowledgeFiles.forEach(file => formData.append('files', file));
      
      // Use new clean endpoint
      const response = await fetch(`${API_BASE}/knowledge/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setKnowledgeUploadStatus({ 
          type: 'success', 
          message: `Successfully uploaded ${knowledgeFiles.length} file(s)` 
        });
        setKnowledgeFiles([]);
        fetchKnowledgeFiles();
      } else {
        setKnowledgeUploadStatus({ 
          type: 'error', 
          message: result.detail || 'Upload failed' 
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setKnowledgeUploadStatus({ 
        type: 'error', 
        message: 'Upload failed. Please try again.' 
      });
    } finally {
      setIsUploadingKnowledge(false);
    }
  };

  const handleWebsiteScan = async (websiteUrl, maxPages, fetchKnowledgeFiles) => {
    if (!websiteUrl.trim()) return;

    setIsScanning(true);
    setWebsiteScanStatus(null);
    setCrawlProgress([]);

    try {
      // Use new clean endpoint
      const response = await fetch(`${API_BASE}/knowledge/scan-website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: websiteUrl, 
          max_pages: parseInt(maxPages) || 5 
        })
      });

      const result = await response.json();

      if (response.ok) {
        setWebsiteScanStatus({ 
          type: 'success', 
          message: `Successfully scanned and added ${result.pages_crawled || 0} pages` 
        });
        setWebsiteUrl('');
        setMaxPages('5');
        fetchKnowledgeFiles();
      } else {
        setWebsiteScanStatus({ 
          type: 'error', 
          message: result.detail || 'Scan failed' 
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      setWebsiteScanStatus({ 
        type: 'error', 
        message: 'Scan failed. Please check the URL and try again.' 
      });
    } finally {
      setIsScanning(false);
    }
  };

  // === DELETE FUNCTIONS ===
  const handleRenameChat = async (sessionId, renameInput) => {
    if (!renameInput.trim()) return;

    try {
      await fetch(`${API_BASE}/chat/${sessionId}/rename?new_title=${encodeURIComponent(renameInput.trim())}`, {
        method: 'POST'
      });
      setRenamingId(null);
      setMenuOpenId(null);
      refreshChatList();
    } catch (err) {
      alert("Rename failed.");
      console.error(err);
    }
  };

  const handleDeleteChat = async (sessionId, activeSessionId) => {
    try {
      const res = await fetch(`${API_BASE}/chat/${sessionId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      if (sessionId === activeSessionId) {
        setActiveSessionId(null);
        setChatHistory([]);
      }

      setMenuOpenId(null);
      setRenamingId(null);
      setDeleteModalOpen(false);
      setChatToDelete(null);
      refreshChatList();
    } catch (err) {
      alert("Delete failed.");
      console.error(err);
    }
  };

  const handleRenameQuestionnaire = async (sessionId, renameInput) => {
    if (!renameInput.trim()) return;

    try {
      await fetch(`${API_BASE}/questionnaires/${sessionId}/rename?new_title=${encodeURIComponent(renameInput.trim())}`, {
        method: 'POST'
      });
      setRenamingQuestionnaireId(null);
      setMenuOpenId(null);
      refreshQuestionnaireList();
    } catch (err) {
      alert("Rename failed.");
      console.error(err);
    }
  };

  const handleDeleteQuestionnaire = async (sessionId, activeQuestionnaireId) => {
    try {
      const res = await fetch(`${API_BASE}/questionnaires/${sessionId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      if (sessionId === activeQuestionnaireId) {
        setActiveQuestionnaireId(null);
        setQuestionnaireResults([]);
        setFile(null);
      }

      setMenuOpenId(null);
      setRenamingQuestionnaireId(null);
      setDeleteModalOpen(false);
      setQuestionnaireToDelete(null);
      refreshQuestionnaireList();
    } catch (err) {
      alert("Delete failed.");
      console.error(err);
    }
  };

  return {
    // Chat functions
    refreshChatList,
    handleSelectChat,
    handleSendMessage,
    handleRenameChat,
    handleDeleteChat,
    
    // Questionnaire functions
    refreshQuestionnaireList,
    handleSelectQuestionnaire,
    handleProcessFile,
    handleRenameQuestionnaire,
    handleDeleteQuestionnaire,
    
    // Knowledge functions
    fetchKnowledgeFiles,
    handleKnowledgeFileSubmit,
    handleWebsiteScan
  };
};

export default useApiHandlers;