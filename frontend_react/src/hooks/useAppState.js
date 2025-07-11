import { useState } from 'react';

const useAppState = () => {
  // Page and UI states
  const [currentPage, setCurrentPage] = useState('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [menuOpenId, setMenuOpenId] = useState(null);
  
  // Chat states
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('F24 QA Expert');
  const [chatList, setChatList] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [showAllChats, setShowAllChats] = useState(false);
  
  // Questionnaire states
  const [file, setFile] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questionnaireList, setQuestionnaireList] = useState([]);
  const [activeQuestionnaireId, setActiveQuestionnaireId] = useState(null);
  const [questionnaireResults, setQuestionnaireResults] = useState([]);
  const [questionnaireToDelete, setQuestionnaireToDelete] = useState(null);
  const [renamingQuestionnaireId, setRenamingQuestionnaireId] = useState(null);
  const [renameQuestionnaireInput, setRenameQuestionnaireInput] = useState('');
  const [showAllQuestionnaires, setShowAllQuestionnaires] = useState(false);
  
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
  const [uploadedKnowledgeFiles, setUploadedKnowledgeFiles] = useState([]);
  const [showUploadedFiles, setShowUploadedFiles] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Static stats
  const [stats] = useState({
    totalQueries: 275,
    avgResponseTime: '1.5s',
    accuracy: 94,
    documentsProcessed: 1250,
    websitesCrawled: 25
  });

  return {
    // Page and UI states
    currentPage, setCurrentPage,
    sidebarCollapsed, setSidebarCollapsed,
    dropdownPosition, setDropdownPosition,
    menuOpenId, setMenuOpenId,
    
    // Chat states
    chatHistory, setChatHistory,
    userInput, setUserInput,
    isLoading, setIsLoading,
    mode, setMode,
    chatList, setChatList,
    activeSessionId, setActiveSessionId,
    renamingId, setRenamingId,
    renameInput, setRenameInput,
    showAllChats, setShowAllChats,
    
    // Questionnaire states
    file, setFile,
    batchResults, setBatchResults,
    isProcessing, setIsProcessing,
    questionnaireList, setQuestionnaireList,
    activeQuestionnaireId, setActiveQuestionnaireId,
    questionnaireResults, setQuestionnaireResults,
    questionnaireToDelete, setQuestionnaireToDelete,
    renamingQuestionnaireId, setRenamingQuestionnaireId,
    renameQuestionnaireInput, setRenameQuestionnaireInput,
    showAllQuestionnaires, setShowAllQuestionnaires,
    
    // Modal states
    deleteModalOpen, setDeleteModalOpen,
    chatToDelete, setChatToDelete,

    // Knowledge Base states
    knowledgeFiles, setKnowledgeFiles,
    isUploadingKnowledge, setIsUploadingKnowledge,
    knowledgeUploadStatus, setKnowledgeUploadStatus,
    websiteUrl, setWebsiteUrl,
    maxPages, setMaxPages,
    isScanning, setIsScanning,
    websiteScanStatus, setWebsiteScanStatus,
    crawlProgress, setCrawlProgress,
    uploadedKnowledgeFiles, setUploadedKnowledgeFiles,
    showUploadedFiles, setShowUploadedFiles,
    isLoadingFiles, setIsLoadingFiles,
    
    // Static data
    stats
  };
};

export default useAppState;
