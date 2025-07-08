import React, { useState, useEffect } from 'react';
import { FileText, MessageCircle } from 'lucide-react';
import ChatPanel from './ChatPanel';
import QuestionnairePanel from './QuestionnairePanel';
import Sidebar from './Sidebar';
import useChat from '../hooks/useChat';
import useQuestionnaire from '../hooks/useQuestionnaire';
import SyncKnowledge from './SyncKnowledge';
import useSyncKnowledge from '../hooks/useSyncKnowledge';
import DeleteConfirmModal from './modals/DeleteConfirmModal';


/**
 * Main layout wrapper for chat + questionnaire assistant UI.
 * Renders sidebar and tabbed content.
 */
const MainLayout = () => {
  const [tab, setTab] = useState('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showAllChats, setShowAllChats] = useState(false);
  const [showAllQuestionnaires, setShowAllQuestionnaires] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [renamingQuestionnaireId, setRenamingQuestionnaireId] = useState(null);
  const [renameQuestionnaireInput, setRenameQuestionnaireInput] = useState('');
  const {syncStats, isSyncing, handleSync} = useSyncKnowledge();
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, type }

  // Hook logic for chat + QA tab
  const chat = useChat();
  const questionnaire = useQuestionnaire();

  useEffect(() => {
    const close = () => setMenuOpenId(null);
    document.addEventListener('dropdown-close', close);
    return () => document.removeEventListener('dropdown-close', close);
  }, []);

  // Shared sidebar data
  const sections = [
    {
      title: 'Questionnaires',
      icon: FileText,
      items: showAllQuestionnaires
        ? questionnaire.questionnaireList || []
        : (questionnaire.questionnaireList || []).slice(0, 10),
      renamingId: renamingQuestionnaireId,
      renameInput: renameQuestionnaireInput,
      onRenameInput: setRenameQuestionnaireInput,
      onRename: questionnaire.handleRenameQuestionnaire,
      onSelect: (id) => {
        questionnaire.handleSelectQuestionnaire(id);
        setTab('upload');
      },
      onSetRenamingId: setRenamingQuestionnaireId,
      showMore: (questionnaire.questionnaireList || []).length > 10,
      showAll: showAllQuestionnaires,
      setShowAll: setShowAllQuestionnaires,
      onDelete: (item) => setDeleteTarget({ id: item.id, type: 'questionnaire' }),
      type: 'questionnaire'
    },
    {
      title: 'Chats',
      icon: MessageCircle,
      items: showAllChats
        ? chat.chatList || []
        : (chat.chatList || []).slice(0, 10),
      renamingId: renamingId,
      renameInput: renameInput,
      onRenameInput: setRenameInput,
      onRename: chat.handleRenameChat,
      onSelect: (id) => {
        chat.handleSelectChat(id);
        setTab('chat');
      },
      onSetRenamingId: setRenamingId,
      showMore: (questionnaire.questionnaireList || []).length > 10,
      showAll: showAllChats,
      setShowAll: setShowAllChats,
      onDelete: (item) => setDeleteTarget({ id: item.id, type: 'chat' }),
      type: 'chat'
    }
  ];

  return (
    <div className="flex min-h-screen bg-[#f5f7fa] font-sans">
      <Sidebar
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        sections={sections}
        menuOpenId={menuOpenId}
        setMenuOpenId={setMenuOpenId}
        dropdownPosition={dropdownPosition}
        setDropdownPosition={setDropdownPosition}
      />

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="flex gap-6 border-b border-gray-200 mb-4">
          {['chat', 'upload'].map(name => (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={`pb-2 px-1 border-b-2 transition font-medium ${
                tab === name
                  ? 'border-[#00B4F1] text-[#00B4F1]'
                  : 'border-transparent text-gray-500 hover:text-[#00B4F1]'
              }`}
            >
              {name === 'chat' ? 'Chat & Ask' : 'Upload Questionnaires'}
            </button>
          ))}
        </div>
        
        {tab === 'chat' && <ChatPanel />}
        {tab === 'upload' && <QuestionnairePanel />}

        <SyncKnowledge
            stats={syncStats}
            onSync={handleSync}
            isSyncing={isSyncing}
        />
        <DeleteConfirmModal
            visible={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => {
                if (deleteTarget?.type === 'chat') {
                    chat.handleDeleteChat(deleteTarget.id);
                } else if (deleteTarget?.type === 'questionnaire') {
                    questionnaire.handleDeleteQuestionnaire(deleteTarget.id);
                }
                setDeleteTarget(null);
        }}
            title="Delete session?"
            description="This action cannot be undone."
        />

      </div>
    </div>
  );
};

export default MainLayout;
