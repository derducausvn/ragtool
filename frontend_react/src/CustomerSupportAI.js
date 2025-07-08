import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Send, ArrowLeftToLine, ArrowRightToLine, Ellipsis, Upload, RefreshCw, Search, Bot,
  MessageCircle, FileText, TrendingUp, Clock, X
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE;
//const API_BASE = "http://127.0.0.1:8000"; // Local backend
const F24_BLUE = "#00B4F1";
const F24_ACCENT = "#0077C8";

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
  const [tab, setTab] = useState('chat');
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('F24 QA Expert');
  const [file, setFile] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [syncProgess, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const [stats] = useState({
    totalQueries: 275,
    avgResponseTime: '1.5s',
    accuracy: 94,
    documentsProcessed: 1250,
    websitesCrawled: 25
  });

  const [kbStats, setKbStats] = useState({ documents: 0, websites: 0, lastSync: null });
  const [lastSync, setLastSync] = useState(null);

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
    setTab('chat');              
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
      setTab("chat");
    } catch (err) {
      console.error("Failed to load chat session:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMsg = { role: 'user', content: userInput };
    let sessionId = activeSessionId;

    setChatHistory(prev => [...prev, userMsg]); // ✅ show immediately
    setUserInput('');
    setIsLoading(true);

    try {
      if (!sessionId) {
        const init = await fetch(`${API_BASE}/chat/new`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: userInput })
        });
        const data = await init.json();
        sessionId = data.session_id;
        setActiveSessionId(sessionId);
        refreshChatList();

        // Send and get assistant reply
        const res = await fetch(`${API_BASE}/chat/${sessionId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userInput, mode })
        });

        const result = await res.json();
        const reply = {
          role: 'assistant',
          content: result.answer || 'No answer returned.',
          sources: result.sources || []
        };

        // Append assistant reply (user message already pushed above)
        setChatHistory(prev => [...prev, reply]);
        setIsLoading(false);
        return; // ✅ Skip remaining block below
      }

      // 2. Send to backend (backend now saves ONLY assistant reply)
      const res = await fetch(`${API_BASE}/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userInput, mode })
      });

      const result = await res.json();
      const reply = {
        role: 'assistant',
        content: result.answer || 'No answer returned.',
        sources: result.sources || []
      };

      setChatHistory(prev => [...prev, reply]);

    } catch (err) {
      console.error("Error:", err);
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
      setTab('upload'); // Switch tab to show results
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
      setTab('upload');
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
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 300);
    try {
      const res = await fetch(`${API_BASE}/sync-knowledge`, { method: 'POST' });
      if (!res.ok) throw new Error(`Sync failed with status ${res.status}`);
      // Fetch new stats after sync
      const statsRes = await fetch(`${API_BASE}/sync-stats`);
      const statsData = await statsRes.json();
      setKbStats(statsData);
      setLastSync(statsData.lastSync);
      console.log('✅ Sync response:', statsData);
    } catch (err) {
      alert('Knowledge sync failed.');
      console.error('❌ Sync error:', err);
    } finally {
      clearInterval(interval);
      setSyncProgress(100);
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };


  const StatCard = ({ icon: Icon, label, value, trend, color }) => (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-4 flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
      </div>
      <div className={`p-2 rounded-full text-white`} style={{ backgroundColor: color }}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );

  const chatEndRef = React.useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isLoading]);

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
              <div className="p-2 rounded-lg text-white" style={{ backgroundColor: F24_BLUE }}>
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
            {/* Shared Section Component */}
            {[{
              title: 'Questionnaires',
              icon: FileText,
              items: showAllQuestionnaires ? questionnaireList : questionnaireList.slice(0, 10),
              renamingId: renamingQuestionnaireId,
              renameInput: renameQuestionnaireInput,
              onRenameInput: setRenameQuestionnaireInput,
              onRename: handleRenameQuestionnaire,
              onSelect: handleSelectQuestionnaire,
              onSetRenamingId: setRenamingQuestionnaireId,
              showMore: questionnaireList.length > 10,
              showAll: showAllQuestionnaires,
              setShowAll: setShowAllQuestionnaires,
              type: 'questionnaire'
            }, {
              title: 'Chats',
              icon: MessageCircle,
              items: showAllChats ? chatList : chatList.slice(0, 10),
              renamingId: renamingId,
              renameInput: renameInput,
              onRenameInput: setRenameInput,
              onRename: handleRenameChat,
              onSelect: handleSelectChat,
              onSetRenamingId: setRenamingId,
              showMore: chatList.length > 10,
              showAll: showAllChats,
              setShowAll: setShowAllChats,
              type: 'chat'
            }].map((section, index) => (
              <div key={index}>
                <div className="flex items-center gap-2 text-sm text-gray-500 font-semibold mb-1 px-2">
                  <section.icon className="w-4 h-4" />
                  <span>{section.title}</span>
                </div>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id} className="group relative flex justify-between items-center pr-1">
                      {section.renamingId === item.id ? (
                        <input
                          value={section.renameInput}
                          onChange={(e) => section.onRenameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') section.onRename(item.id);
                            if (e.key === 'Escape') {
                              section.onSetRenamingId(null);
                              section.onRenameInput('');
                            }
                          }}
                          onBlur={() => {
                            section.onSetRenamingId(null);
                            section.onRenameInput('');
                          }}
                          autoFocus
                          className="w-full text-sm px-1 py-0.5 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span
                          className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                          onClick={() => section.onSelect(item.id)}
                          title={item.title || `Untitled ${section.title}`}
                        >
                          <div className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate max-w-[170px] text-sm text-gray-700">
                            {item.title || `Untitled ${section.title}`}
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
                                section.onSetRenamingId(item.id);
                                section.onRenameInput(item.title || '');
                                setMenuOpenId(null);
                              }}
                            >
                              Rename
                            </button>
                            <button
                              className="block w-full px-3 py-1 text-left text-red-600 hover:bg-red-50"
                              onClick={() => openDeleteModal(item, section.type)}
                            >
                              Delete
                            </button>
                          </div>
                        </DropdownPortal>
                      )}
                    </li>
                  ))}
                </ul>
                {section.showMore && (
                  <button
                    onClick={() => section.setShowAll(!section.showAll)}
                    className="text-xs text-gray-500 mt-1 hover:bg-gray-100 hover:text-gray-700 flex items-center py-1 rounded"
                  >
                    <span className="pl-2 pr-1">
                      <Ellipsis className="w-4 h-4" />
                    </span>
                    <span className="pl-1 pr-4">  {/* 👈 this aligns the text with titles */}
                      {section.showAll ? 'Show less' : 'See more'}
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={MessageCircle} label="Total Queries Today" value={stats.totalQueries} trend="+12% from yesterday" color={F24_BLUE} />
          <StatCard icon={Clock} label="Avg Response Time" value={stats.avgResponseTime} trend="-0.3s improved" color={F24_ACCENT} />
          <StatCard icon={TrendingUp} label="Accuracy Rate" value={`${stats.accuracy}%`} trend="+2% this week" color="#9966CC" />
          <StatCard icon={FileText} label="KB Documents" value={stats.documentsProcessed} trend="Updated 2hrs ago" color="#F59E0B" />
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-4">
          {['chat', 'upload'].map(name => (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={`pb-2 px-1 border-b-2 transition font-medium ${tab === name ? 'border-[#00B4F1] text-[#00B4F1]' : 'border-transparent text-gray-500 hover:text-[#00B4F1]'}`}
            >
              {name === 'chat' ? 'Chat & Ask' : 'Upload Questionnaires'}
            </button>
          ))}
        </div>

        {tab === 'chat' && (
          <div className="bg-white p-6 rounded-xl shadow-md mb-6">
            {/* Top Row: AI Mode + New Chat Button */}
            <div className="mb-4 flex justify-between items-start">
              {/* Left side: AI Mode */}
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">AI Mode:</span>
                  {['F24 QA Expert', 'General Chat'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                        mode === m
                          ? 'bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white shadow'
                          : 'bg-white border text-gray-600 hover:border-[#00B4F1]'
                      }`}
                    >
                      {m === 'General Chat' ? 'General Assistant' : 'F24 QA Expert'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right side: New Chat Button */}
              <button
                onClick={startNewChat}
                title="Start a new chat session"
                className="flex items-center gap-2 text-sm font-medium text-white bg-gradient-to-r from-[#00B4F1] to-[#0077C8] px-4 py-2 rounded-lg hover:shadow-md"
              >
                <Bot className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Chat History */}
            <div className="h-80 overflow-y-auto space-y-2 px-1">
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
                  className={`text-sm max-w-[75%] px-4 py-2 rounded-xl ${
                    msg.role === 'user'
                      ? 'ml-auto bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="bg-gray-200 text-sm px-4 py-2 rounded-lg w-max animate-pulse">...</div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <input
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me..."
                  className="w-full border border-[#00B4F1] rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4F1]"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!userInput.trim()}
                className="bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white px-4 py-2 rounded-full hover:shadow-md disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* Upload Tab */}
        {tab === 'upload' && (
          <div className="bg-white p-6 rounded-xl shadow-md mb-6">
            <h3 className="text-lg font-semibold mb-2 text-[#00B4F1]">Questionnaires Bulk Answering</h3>
            <p className="text-gray-400 text-sm mb-4">Upload new questionnaires and get responses generated automatically.</p>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <Upload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
              <p className="text-xs text-gray-400 mb-4">Limit 200MB per file • XLSX, PDF, DOCX</p>
              <input type="file" accept=".xlsx,.pdf,.docx" onChange={handleFileUpload} className="hidden" id="file-upload" disabled={isProcessing} />
              <label htmlFor="file-upload" className={`inline-block bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white px-4 py-2 rounded-lg cursor-pointer hover:shadow-md ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>Choose Files</label>
            </div>

            {file && <div className="mt-4 text-sm text-gray-700"><strong>Uploaded:</strong> {file.name}</div>}

            {file instanceof File && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleProcessFile}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white px-6 py-2 rounded-lg hover:shadow-md disabled:opacity-60"
                >
                  {isProcessing && (
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l5-5-5-5v4a10 10 0 00-10 10h4z" />
                    </svg>
                  )}
                  {isProcessing ? 'Finding answers to questionnaire…' : 'Generate Answers'}
                </button>
              </div>
            )}
            
            <div className="mt-6 space-y-3">
              {(questionnaireResults.length > 0 ? questionnaireResults : batchResults).map((item, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                  <p className="text-sm font-medium text-gray-700">{item.question}</p>
                  <p className="text-sm mt-1 text-gray-800">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Footer */}
        <div className="bg-white p-6 rounded-xl shadow text-sm text-gray-700 mt-8">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-lg font-semibold text-[#00B4F1]">Knowledge Base Management</h3>
              <p className="text-gray-400 text-sm">F24 QA Mode and Bulk Answering functions retrieve and use data from Knowledge Base.</p>
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:shadow-md"
            >
              <RefreshCw className="w-5 h-5" />
              {isSyncing ? 'Syncing...' : 'Sync Knowledge Base'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <StatCard
              icon={FileText}
              label="Documents Chunks Embedded"
              value={kbStats.documents}
              trend={kbStats.documents > 0 ? '+Up to date' : ''}
              color="#00B4F1"
            />
            <StatCard
              icon={MessageCircle}
              label="Webpage Sections Processed"
              value={kbStats.websites}
              trend={kbStats.websites > 0 ? '+Up to date' : ''}
              color="#00B4F1"
            />
            <StatCard
              icon={Clock}
              label="Last Sync"
              value={lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
              trend={lastSync ? '✔ Synced' : ''}
              color="#00B4F1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupportAI;