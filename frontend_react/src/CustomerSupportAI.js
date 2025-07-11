import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Send, ArrowLeftToLine, ArrowRightToLine, Ellipsis, Upload, RefreshCw, Search, Bot,
  MessageCircle, FileText, TrendingUp, Clock, X
} from 'lucide-react';

// Flexible API base URL for different environments
const API_BASE = process.env.REACT_APP_API_BASE || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://ragtool-backend.onrender.com'  // Your Render backend URL
    : 'http://127.0.0.1:8000'  // Local development
  );

// Custom Delete Confirmation Modal Component
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, itemTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Delete session?</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600">
            This will delete <span className="font-medium">"{itemTitle || "Untitled Session"}"</span>.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This action cannot be undone.
          </p>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white rounded bg-gradient-to-r from-[#f87171] to-[#ef4444] hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerSupportAI = () => {
  const [currentPage, setCurrentPage] = useState('chat');
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('F24 QA Expert');
  const [file, setFile] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [questionnaireList, setQuestionnaireList] = useState([]);
  const [activeQuestionnaireId, setActiveQuestionnaireId] = useState(null);
  const [questionnaireResults, setQuestionnaireResults] = useState([]);
  const [questionnaireToDelete, setQuestionnaireToDelete] = useState(null);
  const [renamingQuestionnaireId, setRenamingQuestionnaireId] = useState(null);
  const [renameQuestionnaireInput, setRenameQuestionnaireInput] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showAllQuestionnaires, setShowAllQuestionnaires] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);

  // Knowledge Base states
  const [knowledgeFiles, setKnowledgeFiles] = useState([]);
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false);
  const [knowledgeUploadStatus, setKnowledgeUploadStatus] = useState(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [maxPages, setMaxPages] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [websiteScanStatus, setWebsiteScanStatus] = useState(null);
  const [crawlProgress, setCrawlProgress] = useState([]);

  const [stats] = useState({
    totalQueries: 275,
    avgResponseTime: '1.5s',
    accuracy: 94,
    documentsProcessed: 1250,
    websitesCrawled: 25
  });

  useEffect(() => {
    // Fetch chat history on mount
    fetch(`${API_BASE}/chat/history`)
      .then(res => res.json())
      .then(data => {
        setChatList(data.history || []);
      })
      .catch(err => console.error("Failed to fetch chat history:", err));

    // Fetch questionnaire history
    fetch(`${API_BASE}/questionnaire/history`)
      .then(res => res.json())
      .then(data => setQuestionnaireList(data.history || []));

    // Close menu on outside click (Portal-safe)
    const handleClickOutside = (event) => {
      if (
        !event.target.closest('.dropdown-menu') &&
        !event.target.closest('.dropdown-trigger')
      ) {
        setMenuOpenId(null);
      }};

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
    
  const startNewChat = () => {
    setActiveSessionId(null);     
    setChatHistory([]);
    setCurrentPage('chat');              
  };

  const handleRenameChat = async (sessionId) => {
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

  const handleDeleteChat = async (sessionId) => {
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

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMsg = { role: 'user', content: userInput };
    setChatHistory(prev => [...prev, userMsg]); // Show user message immediately
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
      setChatHistory(prev => [...prev, reply]);
      
      // Refresh chat list to show the new/updated session
      refreshChatList();
    } catch (err) {
      console.error('Error:', err);
      const errMsg = {
        role: 'assistant',
        content: 'Error fetching answer.',
        sources: []
      };
      setChatHistory(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
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

  const refreshQuestionnaireList = async () => {
    try {
      const res = await fetch(`${API_BASE}/questionnaire/history`);
      const data = await res.json();
      setQuestionnaireList(data.history || []);
    } catch (err) {
      console.error("Failed to refresh questionnaire list:", err);
    }
  };  
  
  const handleRenameQuestionnaire = async (sessionId) => {
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

  const handleDeleteQuestionnaire = async (sessionId) => {
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

  const confirmDelete = () => {
    try {
      if (chatToDelete) {
        console.log("Deleting CHAT session:", chatToDelete.id);
        handleDeleteChat(chatToDelete.id);
      } else if (questionnaireToDelete) {
        console.log("Deleting QUESTIONNAIRE session:", questionnaireToDelete.id);
        handleDeleteQuestionnaire(questionnaireToDelete.id);
      } else {
        throw new Error("Nothing selected for deletion");
      }
    } catch (err) {
      alert("Delete failed.");
      console.error("Delete failed:", err);
    } finally {
      closeDeleteModal();
    }
  };

  const openDeleteModal = (item, type) => {
    if (type === 'chat') {
      setChatToDelete(item);
      setQuestionnaireToDelete(null);
    } else if (type === 'questionnaire') {
      setQuestionnaireToDelete(item);
      setChatToDelete(null);
    }
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setChatToDelete(null);
    setQuestionnaireToDelete(null);
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Reset any previous session
      setActiveQuestionnaireId(null);
      setBatchResults([]);
      setQuestionnaireResults([]);
      setFile(selectedFile); // this triggers UI update
    }
  };

  const handleKnowledgeFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setKnowledgeFiles(selectedFiles);
      setKnowledgeUploadStatus(null); // Clear any previous status
    }
  };

  const handleKnowledgeFileSubmit = async () => {
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
            const message = responseData.converted_to_pdf 
              ? `${file.name} (converted to PDF)` 
              : file.name;
            uploadResults.push({ file: message, status: 'success' });
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
      if (errorCount === 0) {
        const hasConversions = uploadResults.some(result => result.file.includes('converted to PDF'));
        let message = `All ${successCount} file(s) uploaded successfully!`;
        if (hasConversions) {
          message += ' Excel files were automatically converted to PDF for better compatibility.';
        }
        setKnowledgeUploadStatus({ 
          type: 'success', 
          message: message
        });
        setKnowledgeFiles([]); // Clear the selected files
        // Clear the file input
        const fileInput = document.getElementById('knowledge-upload-input');
        if (fileInput) fileInput.value = '';
      } else if (successCount === 0) {
        setKnowledgeUploadStatus({ 
          type: 'error', 
          message: `All ${errorCount} file(s) failed to upload.` 
        });
      } else {
        setKnowledgeUploadStatus({ 
          type: 'warning', 
          message: `${successCount} file(s) uploaded successfully, ${errorCount} failed.` 
        });
      }
      
    } catch (err) {
      setKnowledgeUploadStatus({ type: 'error', message: 'Unexpected error occurred during upload.' });
    } finally {
      setIsUploadingKnowledge(false);
    }
  };

  const handleWebsiteScan = async () => {
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

  const handleProcessFile = async () => {
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

  const DropdownPortal = ({ children, position }) => {
    const portalRoot = document.getElementById('portal-root');

    const style = {
      position: 'absolute',
      top: position.top,
      left: position.left,
      zIndex: 9999
    };

    return createPortal(
      <div style={style} className="dropdown-menu bg-white border shadow-lg rounded w-32">
        {children}
      </div>,
      portalRoot
    );
  };

  const chatEndRef = React.useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isLoading]);

  // Clear status messages after successful operations
  useEffect(() => {
    if (knowledgeUploadStatus?.type === 'success') {
      const timer = setTimeout(() => {
        setKnowledgeUploadStatus(null);
      }, 10000); // Clear after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [knowledgeUploadStatus]);

  useEffect(() => {
    if (websiteScanStatus?.type === 'success') {
      const timer = setTimeout(() => {
        setWebsiteScanStatus(null);
        setCrawlProgress([]); // Also clear progress
      }, 10000); // Clear after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [websiteScanStatus]);

  return (
    <div className="flex min-h-screen bg-[#f5f7fa] font-sans">
      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        itemTitle={(chatToDelete || questionnaireToDelete)?.title}
      />

      {/* Sidebar Wrapper */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg p-2 border-r text-sm flex flex-col relative overflow-hidden`}>
        {/* Header Row: Logo + Collapse Button */}
        <div className="flex items-center justify-between mb-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg text-white btn-primary">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-[#00B4F1] leading-none">F24 AI Assistant</h1>
                <p className="text-xs text-gray-400">Chatbot for Questionnaires</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded hover:bg-gray-200"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <ArrowRightToLine className="w-5 h-5 text-gray-600" />
            ) : (
              <ArrowLeftToLine className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Full Content Only When Expanded */}
        {!sidebarCollapsed && (
          <div className="flex flex-col gap-4">
            {/* Navigation Menu */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-500 mb-2 px-2">NAVIGATION</div>
              {[
                { id: 'chat', icon: MessageCircle, label: 'Chat & Ask' },
                { id: 'questionnaire', icon: FileText, label: 'Customer Questionnaires' },
                { id: 'knowledge', icon: Upload, label: 'Knowledge Base' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  disabled={isUploadingKnowledge || isScanning}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition ${
                    currentPage === item.id
                      ? 'btn-primary text-white'
                      : (isUploadingKnowledge || isScanning)
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* History Sections */}
            {/* Show only relevant history based on current page */}
            {currentPage === 'chat' && (
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold mb-1 px-2">
                  <MessageCircle className="w-3 h-3" />
                  <span>Chats</span>
                </div>
                <ul className="space-y-1">
                  {(showAllChats ? chatList : chatList.slice(0, 10)).map((item) => (
                    <li key={item.id} className="group relative flex justify-between items-center pr-1">
                      {renamingId === item.id ? (
                        <input
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameChat(item.id);
                            if (e.key === 'Escape') {
                              setRenamingId(null);
                              setRenameInput('');
                            }
                          }}
                          onBlur={() => {
                            setRenamingId(null);
                            setRenameInput('');
                          }}
                          autoFocus
                          className="w-full text-sm px-1 py-0.5 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span
                          className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleSelectChat(item.id)}
                          title={item.title || "Untitled Chat"}
                        >
                          <div className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate max-w-[170px] text-sm text-gray-700">
                            {item.title || "Untitled Chat"}
                          </span>
                        </span>
                      )}
                      <div
                        className="hidden group-hover:flex items-center ml-1 cursor-pointer dropdown-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
                          setMenuOpenId(item.id === menuOpenId ? null : item.id);
                        }}
                      >
                        <span className="text-gray-400 hover:text-gray-600">⋯</span>
                      </div>
                      {menuOpenId === item.id && dropdownPosition && (
                        <DropdownPortal position={dropdownPosition}>
                          <div className="bg-white shadow-lg border rounded-md text-sm">
                            <button
                              className="block w-full px-3 py-1 text-left hover:bg-gray-100"
                              onClick={() => {
                                setRenamingId(item.id);
                                setRenameInput(item.title || '');
                                setMenuOpenId(null);
                              }}
                            >
                              Rename
                            </button>
                            <button
                              className="block w-full px-3 py-1 text-left text-red-600 hover:bg-red-50"
                              onClick={() => openDeleteModal(item, 'chat')}
                            >
                              Delete
                            </button>
                          </div>
                        </DropdownPortal>
                      )}
                    </li>
                  ))}
                </ul>
                {chatList.length > 10 && (
                  <button
                    onClick={() => setShowAllChats(!showAllChats)}
                    className="text-xs text-gray-500 mt-1 hover:bg-gray-100 hover:text-gray-700 flex items-center py-1 rounded"
                  >
                    <span className="pl-2 pr-1">
                      <Ellipsis className="w-4 h-4" />
                    </span>
                    <span className="pl-1 pr-4">
                      {showAllChats ? 'Show less' : 'See more'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {currentPage === 'questionnaire' && (
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold mb-1 px-2">
                  <FileText className="w-3 h-3" />
                  <span>Questionnaires</span>
                </div>
                <ul className="space-y-1">
                  {(showAllQuestionnaires ? questionnaireList : questionnaireList.slice(0, 10)).map((item) => (
                    <li key={item.id} className="group relative flex justify-between items-center pr-1">
                      {renamingQuestionnaireId === item.id ? (
                        <input
                          value={renameQuestionnaireInput}
                          onChange={(e) => setRenameQuestionnaireInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameQuestionnaire(item.id);
                            if (e.key === 'Escape') {
                              setRenamingQuestionnaireId(null);
                              setRenameQuestionnaireInput('');
                            }
                          }}
                          onBlur={() => {
                            setRenamingQuestionnaireId(null);
                            setRenameQuestionnaireInput('');
                          }}
                          autoFocus
                          className="w-full text-sm px-1 py-0.5 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span
                          className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleSelectQuestionnaire(item.id)}
                          title={item.title || "Untitled Questionnaire"}
                        >
                          <div className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate max-w-[170px] text-sm text-gray-700">
                            {item.title || "Untitled Questionnaire"}
                          </span>
                        </span>
                      )}
                      <div
                        className="hidden group-hover:flex items-center ml-1 cursor-pointer dropdown-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
                          setMenuOpenId(item.id === menuOpenId ? null : item.id);
                        }}
                      >
                        <span className="text-gray-400 hover:text-gray-600">⋯</span>
                      </div>
                      {menuOpenId === item.id && dropdownPosition && (
                        <DropdownPortal position={dropdownPosition}>
                          <div className="bg-white shadow-lg border rounded-md text-sm">
                            <button
                              className="block w-full px-3 py-1 text-left hover:bg-gray-100"
                              onClick={() => {
                                setRenamingQuestionnaireId(item.id);
                                setRenameQuestionnaireInput(item.title || '');
                                setMenuOpenId(null);
                              }}
                            >
                              Rename
                            </button>
                            <button
                              className="block w-full px-3 py-1 text-left text-red-600 hover:bg-red-50"
                              onClick={() => openDeleteModal(item, 'questionnaire')}
                            >
                              Delete
                            </button>
                          </div>
                        </DropdownPortal>
                      )}
                    </li>
                  ))}
                </ul>
                {questionnaireList.length > 10 && (
                  <button
                    onClick={() => setShowAllQuestionnaires(!showAllQuestionnaires)}
                    className="text-xs text-gray-500 mt-1 hover:bg-gray-100 hover:text-gray-700 flex items-center py-1 rounded"
                  >
                    <span className="pl-2 pr-1">
                      <Ellipsis className="w-4 h-4" />
                    </span>
                    <span className="pl-1 pr-4">
                      {showAllQuestionnaires ? 'Show less' : 'See more'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        {/* Chat & Ask Page */}
        {currentPage === 'chat' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-2xl font-bold text-[#00B4F1] mb-4">Chat & Ask</h2>
              <p className="text-gray-400 text-sm mb-6">Interact with our AI assistant in either F24 QA Expert mode or General Chat mode.</p>
              
              {/* AI Mode Selection - Integrated at top */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {['F24 QA Expert', 'General Chat'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        mode === m
                          ? 'btn-primary text-white shadow'
                          : 'bg-white border border-gray-300 text-gray-600 hover:border-[#00B4F1]'
                      }`}
                    >
                      {m === 'General Chat' ? 'General Assistant' : 'F24 QA Expert'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat History */}
              <div className="h-80 overflow-y-auto space-y-2 px-1 mb-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                {chatHistory.length === 0 && !isLoading && (
                  <div className="text-center text-gray-400 mt-12">
                    <Bot className="mx-auto w-8 h-8 mb-2" />
                    <p className="text-sm">
                      {mode === 'General Chat'
                        ? "Ask me anything, I'm your general assistant!"
                        : "Ask me anything, I will answer on behalf of F24!"}
                    </p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-sm w-fit max-w-[75%] px-4 py-2 rounded-xl ${
                      msg.role === 'user'
                        ? 'ml-auto btn-primary text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                    style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}
                  >
                    {msg.content}
                  </div>
                ))}
                {isLoading && (
                  <div className="bg-gray-200 text-sm px-4 py-2 rounded-lg w-fit animate-pulse">...</div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex gap-3">
                <button
                  onClick={startNewChat}
                  title="Start a new chat session"
                  className="flex items-center gap-2 text-sm font-medium text-white btn-primary px-4 py-2 rounded-lg hover:shadow-md whitespace-nowrap"
                >
                  <Bot className="w-4 h-4" />
                  New Chat
                </button>
                <div className="relative flex-1">
                  <input
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder={mode === 'General Chat' ? "Ask me anything..." : "Ask about F24..."}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4F1]"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim()}
                  className="btn-primary text-white px-4 py-2 rounded-lg hover:shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Upload Questionnaires Page */}
        {currentPage === 'questionnaire' && (
          <div className="bg-white p-6 rounded-xl shadow-md mb-6">
            <h2 className="text-2xl font-bold text-[#00B4F1] mb-4">Customer Questionnaires</h2>
            <p className="text-gray-400 text-sm mb-6">Upload new customer questionnaires and get responses generated automatically.</p>

            {/* Questionnaire Upload Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Questionnaire Upload</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <Upload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
              <p className="text-center text-gray-600 mb-4">Select one questionnaire at a time and generate answers</p>
              <p className="text-xs text-gray-400 text-center mb-4">Supported formats: XLSX, PDF, DOCX</p>
              
              <div className="flex flex-col items-center gap-3">
                <input 
                  type="file" 
                  accept=".xlsx,.pdf,.docx" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  id="questionnaire-upload-input" 
                  disabled={isProcessing} 
                />
                <label 
                  htmlFor="questionnaire-upload-input" 
                  className={`inline-block text-white px-6 py-2 rounded-lg cursor-pointer transition ${
                    isProcessing 
                      ? 'btn-primary-disabled' 
                      : 'btn-primary-hover'
                  }`}
                >
                  Choose File to Upload
                </label>
                
                {/* Selected file display */}
                {file && (
                  <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border max-w-full">
                    <strong>Selected:</strong>
                    <div className="mt-1">
                      <div className="text-xs text-gray-600 truncate">
                        • {file.name}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Generate button */}
                {file && (
                  <button
                    onClick={handleProcessFile}
                    disabled={isProcessing}
                    className={`flex items-center gap-2 text-white px-6 py-2 rounded-lg transition ${
                      isProcessing 
                        ? 'btn-primary-disabled opacity-60' 
                        : 'btn-primary-hover'
                    }`}
                  >
                    {isProcessing && (
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l5-5-5-5v4a10 10 0 00-10 10h4z" />
                      </svg>
                    )}
                    {isProcessing ? 'Finding answers to questionnaire…' : 'Generate Answers'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              {(questionnaireResults.length > 0 ? questionnaireResults : batchResults).map((item, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                  <p className="text-sm font-medium text-gray-700">{item.question}</p>
                  <p className="text-sm mt-1 text-gray-800">{item.answer}</p>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {/* Knowledge Base Management Page */}
        {currentPage === 'knowledge' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-2xl font-bold text-[#00B4F1] mb-4">Knowledge Base Management</h2>
              <p className="text-gray-400 text-sm mb-6">Upload documents or scan websites to add to the Knowledge Base for F24 QA Mode and Bulk Answering.</p>
              
              {/* File Upload Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Document Upload</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
                  <Upload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-center text-gray-600 mb-4">Upload documents to the knowledge base</p>
                  <p className="text-xs text-gray-400 text-center mb-4">Supported formats: XLSX, PDF, DOCX, TXT</p>
                  
                  <div className="flex flex-col items-center gap-3">
                    <input
                      type="file"
                      accept=".pdf,.docx,.xlsx,.txt"
                      id="knowledge-upload-input"
                      className="hidden"
                      onChange={handleKnowledgeFileUpload}
                      disabled={isUploadingKnowledge}
                      multiple
                    />
                    <label 
                      htmlFor="knowledge-upload-input" 
                      className={`inline-block text-white px-6 py-2 rounded-lg cursor-pointer transition ${
                        isUploadingKnowledge 
                          ? 'btn-primary-disabled' 
                          : 'btn-primary-hover'
                      }`}
                    >
                      Choose File to Upload
                    </label>
                    
                    {/* Selected files display */}
                    {knowledgeFiles.length > 0 && (
                      <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border max-w-full">
                        <strong>Selected ({knowledgeFiles.length} file{knowledgeFiles.length > 1 ? 's' : ''}):</strong>
                        <div className="mt-1 max-h-24 overflow-y-auto">
                          {knowledgeFiles.map((file, index) => (
                            <div key={index} className="text-xs text-gray-600 truncate">
                              • {file.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Upload button */}
                    {knowledgeFiles.length > 0 && (
                      <button
                        onClick={handleKnowledgeFileSubmit}
                        disabled={isUploadingKnowledge}
                        className={`flex items-center gap-2 text-white px-6 py-2 rounded-lg transition ${
                          isUploadingKnowledge 
                            ? 'btn-primary-disabled opacity-60' 
                            : 'btn-primary-hover'
                        }`}
                      >
                        {isUploadingKnowledge && (
                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l5-5-5-5v4a10 10 0 00-10 10h4z" />
                          </svg>
                        )}
                        {isUploadingKnowledge ? 'Uploading...' : 'Upload to Knowledge Base'}
                      </button>
                    )}
                    
                    {/* Status message */}
                    {knowledgeUploadStatus && (
                      <div className={`text-sm px-4 py-2 rounded-lg border ${
                        knowledgeUploadStatus.type === 'success' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : knowledgeUploadStatus.type === 'warning'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {String(knowledgeUploadStatus.message || '')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Website Scan Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Website Content Scan</h3>
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Search className="w-6 h-6 text-[#00B4F1]" />
                    <div>
                      <p className="text-gray-600">Scan and import website content</p>
                      <p className="text-xs text-gray-400">Enter a website URL to crawl and add its content to the knowledge base</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* URL Input and Controls Row */}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="Enter website URL (e.g., https://example.com)"
                        className={`flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4F1] ${
                          isScanning ? 'opacity-50' : ''
                        }`}
                        disabled={isScanning}
                      />
                      
                      {/* Pages to crawl input */}
                      <input
                        type="number"
                        value={maxPages}
                        onChange={(e) => setMaxPages(e.target.value)}
                        placeholder="Pages to crawl (1-20)"
                        min="1"
                        max="20"
                        className={`w-48 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4F1] ${
                          isScanning ? 'opacity-50' : ''
                        }`}
                        disabled={isScanning}
                      />
                      
                      {/* Scan Button */}
                      <button
                        onClick={handleWebsiteScan}
                        disabled={isScanning}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg transition whitespace-nowrap btn-primary text-white hover:shadow-md ${
                          isScanning ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isScanning && (
                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l5-5-5-5v4a10 10 0 00-10 10h4z" />
                          </svg>
                        )}
                        {isScanning ? 'Scanning Website...' : 'Scan Website'}
                      </button>
                    </div>
                    
                    {/* Status message */}
                    {websiteScanStatus && (
                      <div className={`text-sm px-4 py-2 rounded-lg border ${
                        websiteScanStatus.type === 'success' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {String(websiteScanStatus.message || '')}
                      </div>
                    )}
                    
                    {/* Crawl Progress Display */}
                    {crawlProgress.length > 0 && (
                      <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <div className="font-medium text-blue-800 mb-2">Pages Found:</div>
                        <div className="space-y-1 font-mono text-xs">
                          {crawlProgress.map((message, index) => (
                            <div key={index} className="text-blue-700">
                              {message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSupportAI;
