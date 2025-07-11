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

  const refreshChatList = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/history`);
      const data = await res.json();
      setChatList(data.history || []);
    } catch (err) {
      console.error("Failed to refresh chat list:", err);
    }
  };

  const refreshQuestionnaireList = async () => {
    try {
      const res = await fetch(`${API_BASE}/questionnaire/history`);
      const data = await res.json();
      setQuestionnaireList(data.history || []);
    } catch (err) {
      console.error("Failed to refresh questionnaire list:", err);
    }
  };

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

  const handleSelectQuestionnaire = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/questionnaire/${sessionId}`);
      const data = await res.json();
      setQuestionnaireResults(data.results || []);
      setFile({ name: data.file_name }); // Fake a file object just for display
      setActiveQuestionnaireId(sessionId);
      setCurrentPage('questionnaire'); // Switch to questionnaire page
    } catch (err) {
      console.error("Failed to load questionnaire session:", err);
    }
  };

  const handleRenameQuestionnaire = async (sessionId, renameQuestionnaireInput) => {
    if (!renameQuestionnaireInput.trim()) return;
    try {
      await fetch(`${API_BASE}/questionnaire/${sessionId}/rename?new_title=${encodeURIComponent(renameQuestionnaireInput.trim())}`, {
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
      const res = await fetch(`${API_BASE}/questionnaire/${sessionId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      if (sessionId === activeQuestionnaireId) {
        setActiveQuestionnaireId(null);
        setQuestionnaireResults([]);
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

  const handleSendMessage = async (userInput, activeSessionId, mode, chatHistory) => {
    if (!userInput.trim()) return;

    const userMsg = { role: 'user', content: userInput };
    setChatHistoryState(prev => [...prev, userMsg]); // Show user message immediately
    const question = userInput;
    setUserInput('');
    setIsLoading(true);

    try {
      // If no active session, create one first
      let sessionId = activeSessionId;
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
        // General Chat mode: Use direct OpenAI GPT-3.5 Turbo
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

  const handleKnowledgeFileSubmit = async (knowledgeFiles, fetchKnowledgeFiles) => {
    if (knowledgeFiles.length === 0) return;
    
    setIsUploadingKnowledge(true);
    setKnowledgeUploadStatus(null);
    
    const uploadResults = [];
    let successCount = 0;
    let errorCount = 0;
    
    try {
      // Upload files one by one
      for (let i = 0; i < knowledgeFiles.length; i++) {
        const file = knowledgeFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const res = await fetch(`${API_BASE}/upload-knowledge-file`, {
            method: 'POST',
            body: formData
          });
          
          if (res.ok) {
            const responseData = await res.json();
            successCount++;
            
            if (responseData.duplicate) {
              // Handle duplicate file
              uploadResults.push({ 
                file: file.name, 
                status: 'duplicate',
                message: responseData.message 
              });
            } else {
              // Handle successful upload
              const message = responseData.converted_to_pdf 
                ? `${file.name} (converted to PDF)` 
                : file.name;
              uploadResults.push({ file: message, status: 'success' });
            }
          } else {
            errorCount++;
            let errorMessage = 'Upload failed';
            try {
              const errorData = await res.json();
              errorMessage = errorData.detail || errorMessage;
            } catch (parseError) {
              errorMessage = `HTTP ${res.status}: ${res.statusText}`;
            }
            uploadResults.push({ file: file.name, status: 'error', error: errorMessage });
          }
        } catch (err) {
          errorCount++;
          uploadResults.push({ file: file.name, status: 'error', error: `Network error: ${err.message}` });
        }
      }
      
      // Set status based on results
      const duplicateCount = uploadResults.filter(r => r.status === 'duplicate').length;
      const actualSuccessCount = successCount - duplicateCount;
      
      if (errorCount === 0) {
        const hasConversions = uploadResults.some(result => 
          result.status === 'success' && result.file.includes('converted to PDF')
        );
        
        let message;
        if (duplicateCount === uploadResults.length) {
          message = `All ${duplicateCount} file(s) were already in the knowledge base and skipped.`;
        } else if (duplicateCount > 0) {
          message = `${actualSuccessCount} file(s) uploaded successfully, ${duplicateCount} duplicate(s) skipped.`;
        } else {
          message = `All ${actualSuccessCount} file(s) uploaded successfully!`;
        }
        
        if (hasConversions) {
          message += ' Excel files were automatically converted to PDF for better compatibility.';
        }
        
        setKnowledgeUploadStatus({ 
          type: duplicateCount === uploadResults.length ? 'warning' : 'success', 
          message: message
        });
        setKnowledgeFiles([]); // Clear the selected files
        // Clear the file input
        const fileInput = document.getElementById('knowledge-upload-input');
        if (fileInput) fileInput.value = '';
        // Refresh the uploaded files list only if there were actual uploads
        if (actualSuccessCount > 0) {
          await fetchKnowledgeFiles();
        }
      } else if (actualSuccessCount === 0) {
        setKnowledgeUploadStatus({ 
          type: 'error', 
          message: `All ${errorCount} file(s) failed to upload.` 
        });
      } else {
        setKnowledgeUploadStatus({ 
          type: 'warning', 
          message: `${actualSuccessCount} file(s) uploaded successfully, ${errorCount} failed${duplicateCount > 0 ? `, ${duplicateCount} duplicate(s) skipped` : ''}.` 
        });
      }
      
    } catch (err) {
      setKnowledgeUploadStatus({ type: 'error', message: 'Unexpected error occurred during upload.' });
    } finally {
      setIsUploadingKnowledge(false);
    }
  };

  const handleWebsiteScan = async (websiteUrl, maxPages, fetchKnowledgeFiles) => {
    if (!websiteUrl.trim()) return;
    
    setIsScanning(true);
    setWebsiteScanStatus(null);
    setCrawlProgress([]);
    
    const targetPages = parseInt(maxPages) || 5;
    const domain = new URL(websiteUrl.trim()).hostname;
    
    // Show initial progress
    setCrawlProgress([`Starting crawl of ${domain} (max ${targetPages} pages)`]);
    
    try {
      
      const res = await fetch(`${API_BASE}/upload-website-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: websiteUrl.trim(),
          max_pages: targetPages 
        })
      });
      
      if (res.ok) {
        const result = await res.json();
        const pagesCrawled = Number(result.pages_crawled) || 0;
        const sourceUrls = result.source_urls || [];
        
        setCrawlProgress(prev => [
          ...prev, 
          `Crawl complete: ${pagesCrawled} pages processed`
        ]);
        
        // Show the URLs that were crawled
        if (sourceUrls.length > 0) {
          setCrawlProgress(prev => [
            ...prev,
            ...sourceUrls.map((url, idx) => `✓ Page ${idx + 1}: ${url}`)
          ]);
        }
        
        setWebsiteScanStatus({ 
          type: 'success', 
          message: `Website content from ${pagesCrawled} pages uploaded successfully!` 
        });
        setWebsiteUrl(''); // Clear the URL input
        setMaxPages(''); // Clear the pages input
        
        // Refresh the uploaded files list
        await fetchKnowledgeFiles();
        
        // Clear progress after a delay
        setTimeout(() => setCrawlProgress([]), 10000);
      } else {
        const errorData = await res.json().catch(() => ({ detail: 'Website scan failed' }));
        const errorMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : 'Website scan failed.';
        setWebsiteScanStatus({ type: 'error', message: errorMessage });
        setCrawlProgress(prev => [...prev, `❌ Error: ${errorMessage}`]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred during website scan.';
      setWebsiteScanStatus({ type: 'error', message: errorMessage });
      setCrawlProgress(prev => [...prev, `❌ Error: ${errorMessage}`]);
    } finally {
      setIsScanning(false);
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

      const res = await fetch(`${API_BASE}/answer-questionnaire`, {
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

  const fetchKnowledgeFiles = async () => {
    if (state.isLoadingFiles) return;
    setIsLoadingFiles(true);
    try {
      const res = await fetch(`${API_BASE}/knowledge-files`);
      if (res.ok) {
        const data = await res.json();
        setUploadedKnowledgeFiles(data.files || []);
      } else {
        console.error("Failed to fetch knowledge files:", res.statusText);
      }
    } catch (err) {
      console.error("Error fetching knowledge files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  return {
    refreshChatList,
    refreshQuestionnaireList,
    handleRenameChat,
    handleDeleteChat,
    handleSelectChat,
    handleSelectQuestionnaire,
    handleRenameQuestionnaire,
    handleDeleteQuestionnaire,
    handleSendMessage,
    handleKnowledgeFileSubmit,
    handleWebsiteScan,
    handleProcessFile,
    fetchKnowledgeFiles
  };
};

export default useApiHandlers;
