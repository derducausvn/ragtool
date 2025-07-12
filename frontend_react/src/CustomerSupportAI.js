import React, { useState, useEffect, useRef } from 'react';
import LoginForm from "./components/LoginForm";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import AppSidebar from "./components/AppSidebar";
import DashboardPage from "./components/DashboardPage";
import { ChatPage, QuestionnairePage, KnowledgePage } from "./components/PageComponents";
import useKnowledgeFileManager from "./hooks/useKnowledgeFileManager";
import useAppState from "./hooks/useAppState";
import useApiHandlers from "./hooks/useApiHandlers";
import { formatFileSize, formatUploadDate } from "./utils/formatters";

// API Base URL - Comment/uncomment as needed
//const API_BASE = 'http://127.0.0.1:8000';  // Local development
const API_BASE = 'https://ragtool-backend.onrender.com';  // Render production

const CustomerSupportAI = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Use custom hooks for state management
  const state = useAppState();
  const chatEndRef = useRef(null);

  // Knowledge file manager hook
  const {
    fileToDelete,
    isDeletingFile,
    handleDeleteKnowledgeFile,
    confirmDeleteKnowledgeFile,
    cancelDeleteKnowledgeFile
  } = useKnowledgeFileManager(API_BASE);

  // API handlers hook
  const apiHandlers = useApiHandlers(API_BASE, state);

  // Handle knowledge file deletion with modal
  const handleKnowledgeFileDelete = (fileId, filename) => {
    handleDeleteKnowledgeFile(fileId, filename);
  };


  // Basic login handler (replace with Microsoft login later)
  const handleLogin = (form) => {
    // Simple hardcoded check for demo; replace with real backend or Microsoft login
    if (form.username === 'f24' && form.password === 'f24') {
      setIsAuthenticated(true);
      setLoginError(null);
    } else {
      setLoginError('Invalid username or password');
    }
  };

  // Placeholder for future Microsoft login integration
  const handleMicrosoftLogin = () => {
    // TODO: Integrate Microsoft authentication here
    alert('Microsoft login integration coming soon!');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginForm({ username: '', password: '' });
  };

  const confirmKnowledgeFileDelete = async () => {
    await confirmDeleteKnowledgeFile(
      (message) => {
        apiHandlers.fetchKnowledgeFiles();
        state.setKnowledgeUploadStatus({ type: 'success', message });
      },
      (message) => {
        state.setKnowledgeUploadStatus({ type: 'error', message });
      }
    );
  };

  useEffect(() => {
    // Fetch chat history on mount - using correct endpoint
    fetch(`${API_BASE}/chat/history`)
      .then(res => res.json())
      .then(data => {
        state.setChatList(data.history || []);
      })
      .catch(err => console.error("Failed to fetch chat history:", err));

    // Fetch questionnaire history - using correct endpoint
    fetch(`${API_BASE}/questionnaires/history`)
      .then(res => res.json())
      .then(data => state.setQuestionnaireList(data.history || []))
      .catch(err => console.error("Failed to fetch questionnaire history:", err));

    // Fetch knowledge base files when on knowledge page
    if (state.currentPage === 'knowledge') {
      apiHandlers.fetchKnowledgeFiles();
    }

    // Close menu on outside click (Portal-safe)
    const handleClickOutside = (event) => {
      if (
        !event.target.closest('.dropdown-menu') &&
        !event.target.closest('.dropdown-trigger')
      ) {
        state.setMenuOpenId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [state.currentPage]);
    
  const startNewChat = () => {
    state.setActiveSessionId(null);     
    state.setChatHistory([]);
    state.setCurrentPage('chat');              
  };

  const confirmDelete = () => {
    try {
      if (state.chatToDelete) {
        console.log("Deleting CHAT session:", state.chatToDelete.id);
        apiHandlers.handleDeleteChat(state.chatToDelete.id, state.activeSessionId);
      } else if (state.questionnaireToDelete) {
        console.log("Deleting QUESTIONNAIRE session:", state.questionnaireToDelete.id);
        apiHandlers.handleDeleteQuestionnaire(state.questionnaireToDelete.id, state.activeQuestionnaireId);
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
      state.setChatToDelete(item);
      state.setQuestionnaireToDelete(null);
    } else if (type === 'questionnaire') {
      state.setQuestionnaireToDelete(item);
      state.setChatToDelete(null);
    }
    state.setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    state.setDeleteModalOpen(false);
    state.setChatToDelete(null);
    state.setQuestionnaireToDelete(null);
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Reset any previous session
      state.setActiveQuestionnaireId(null);
      state.setBatchResults([]);
      state.setQuestionnaireResults([]);
      state.setFile(selectedFile); // this triggers UI update
    }
  };

  const handleKnowledgeFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      state.setKnowledgeFiles(selectedFiles);
      state.setKnowledgeUploadStatus(null); // Clear any previous status
    }
  };

  
  // Clear status messages after successful operations
  useEffect(() => {
    if (state.knowledgeUploadStatus?.type === 'success') {
      const timer = setTimeout(() => {
        state.setKnowledgeUploadStatus(null);
      }, 10000); // Clear after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [state.knowledgeUploadStatus]);

  useEffect(() => {
    if (state.websiteScanStatus?.type === 'success') {
      const timer = setTimeout(() => {
        state.setWebsiteScanStatus(null);
        state.setCrawlProgress([]); // Also clear progress
      }, 10000); // Clear after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [state.websiteScanStatus]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.chatHistory, state.isLoading]);
    
  // Auto-collapse history lists when switching pages
  useEffect(() => {
    state.setShowAllChats(false);
    state.setShowAllQuestionnaires(false);
  }, [state.currentPage]);


  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <LoginForm
        onLogin={handleLogin}
        onMicrosoftLogin={handleMicrosoftLogin}
        error={loginError}
      />
    );
  }

  // Main app UI (only visible if authenticated)
  return (
    <div className="flex min-h-screen bg-[#f5f7fa] font-sans">
      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={state.deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        itemTitle={(state.chatToDelete || state.questionnaireToDelete)?.title}
        itemType={state.chatToDelete ? 'chat' : state.questionnaireToDelete ? 'questionnaire' : 'item'}
      />

      {/* Knowledge File Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!fileToDelete}
        onClose={cancelDeleteKnowledgeFile}
        onConfirm={confirmKnowledgeFileDelete}
        itemTitle={fileToDelete?.filename}
        itemType="file"
      />

      {/* Sidebar Wrapper */}
      <div className={`transition-all duration-300 ${state.sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg p-2 border-r text-sm flex flex-col relative overflow-hidden`}>
        <AppSidebar 
          sidebarCollapsed={state.sidebarCollapsed}
          setSidebarCollapsed={state.setSidebarCollapsed}
          currentPage={state.currentPage}
          setCurrentPage={state.setCurrentPage}
          isUploadingKnowledge={state.isUploadingKnowledge}
          isScanning={state.isScanning}
          chatList={state.chatList}
          questionnaireList={state.questionnaireList}
          showAllChats={state.showAllChats}
          showAllQuestionnaires={state.showAllQuestionnaires}
          setShowAllChats={state.setShowAllChats}
          setShowAllQuestionnaires={state.setShowAllQuestionnaires}
          renamingId={state.renamingId}
          renamingQuestionnaireId={state.renamingQuestionnaireId}
          renameInput={state.renameInput}
          renameQuestionnaireInput={state.renameQuestionnaireInput}
          setRenameInput={state.setRenameInput}
          setRenameQuestionnaireInput={state.setRenameQuestionnaireInput}
          menuOpenId={state.menuOpenId}
          dropdownPosition={state.dropdownPosition}
          setDropdownPosition={state.setDropdownPosition}
          setMenuOpenId={state.setMenuOpenId}
          handleSelectChat={apiHandlers.handleSelectChat}
          handleSelectQuestionnaire={apiHandlers.handleSelectQuestionnaire}
          handleRenameChat={apiHandlers.handleRenameChat}
          handleRenameQuestionnaire={apiHandlers.handleRenameQuestionnaire}
          setRenamingId={state.setRenamingId}
          setRenamingQuestionnaireId={state.setRenamingQuestionnaireId}
          openDeleteModal={openDeleteModal}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        {/* Dashboard Page */}
        {state.currentPage === 'dashboard' && (
          <DashboardPage 
            setCurrentPage={state.setCurrentPage}
            chatList={state.chatList}
            questionnaireList={state.questionnaireList}
            uploadedKnowledgeFiles={state.uploadedKnowledgeFiles}
          />
        )}

        {/* Chat & Ask Page */}
        {state.currentPage === 'chat' && (
          <ChatPage 
            mode={state.mode}
            setMode={state.setMode}
            chatHistory={state.chatHistory}
            isLoading={state.isLoading}
            userInput={state.userInput}
            setUserInput={state.setUserInput}
            handleSendMessage={() => apiHandlers.handleSendMessage(state.userInput, state.activeSessionId, state.mode, state.chatHistory)}
            startNewChat={startNewChat}
            chatEndRef={chatEndRef}
          />
        )}
        
        {/* Upload Questionnaires Page */}
        {state.currentPage === 'questionnaire' && (
          <QuestionnairePage 
            file={state.file}
            isProcessing={state.isProcessing}
            handleFileUpload={handleFileUpload}
            handleProcessFile={() => apiHandlers.handleProcessFile(state.file, apiHandlers.refreshQuestionnaireList)}
            questionnaireResults={state.questionnaireResults}
            batchResults={state.batchResults}
          />
        )}

        {/* Knowledge Base Management Page */}
        {state.currentPage === 'knowledge' && (
          <KnowledgePage 
            knowledgeFiles={state.knowledgeFiles}
            isUploadingKnowledge={state.isUploadingKnowledge}
            knowledgeUploadStatus={state.knowledgeUploadStatus}
            handleKnowledgeFileUpload={handleKnowledgeFileUpload}
            handleKnowledgeFileSubmit={() => apiHandlers.handleKnowledgeFileSubmit(state.knowledgeFiles, apiHandlers.fetchKnowledgeFiles)}
            websiteUrl={state.websiteUrl}
            setWebsiteUrl={state.setWebsiteUrl}
            maxPages={state.maxPages}
            setMaxPages={state.setMaxPages}
            isScanning={state.isScanning}
            websiteScanStatus={state.websiteScanStatus}
            crawlProgress={state.crawlProgress}
            handleWebsiteScan={() => apiHandlers.handleWebsiteScan(state.websiteUrl, state.maxPages, apiHandlers.fetchKnowledgeFiles)}
            uploadedKnowledgeFiles={state.uploadedKnowledgeFiles}
            showUploadedFiles={state.showUploadedFiles}
            setShowUploadedFiles={state.setShowUploadedFiles}
            isLoadingFiles={state.isLoadingFiles}
            isDeletingFile={isDeletingFile}
            fetchKnowledgeFiles={apiHandlers.fetchKnowledgeFiles}
            handleKnowledgeFileDelete={handleKnowledgeFileDelete}
            formatFileSize={formatFileSize}
            formatUploadDate={formatUploadDate}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerSupportAI;