import React from 'react';
import { MessageCircle, FileText, Ellipsis, Bot, ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';
import DropdownPortal from './DropdownPortal';
import NavigationMenu from './NavigationMenu';

const AppSidebar = ({ 
  sidebarCollapsed, 
  setSidebarCollapsed,
  currentPage, 
  setCurrentPage,
  isUploadingKnowledge,
  isScanning,
  chatList, 
  questionnaireList,
  showAllChats,
  showAllQuestionnaires,
  setShowAllChats,
  setShowAllQuestionnaires,
  renamingId,
  renamingQuestionnaireId,
  renameInput,
  renameQuestionnaireInput,
  setRenameInput,
  setRenameQuestionnaireInput,
  menuOpenId,
  dropdownPosition,
  setDropdownPosition,
  setMenuOpenId,
  handleSelectChat,
  handleSelectQuestionnaire,
  handleRenameChat,
  handleRenameQuestionnaire,
  setRenamingId,
  setRenamingQuestionnaireId,
  openDeleteModal
}) => {
  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between mb-2">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg text-white btn-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#00B4F1] leading-none">F24 AI Assistant</h1>
              <p className="text-xs text-gray-400">Knowledge-based Assistant</p>
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

      {!sidebarCollapsed && (
        <>
          {/* Navigation Menu */}
          <NavigationMenu
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isUploadingKnowledge={isUploadingKnowledge}
            isScanning={isScanning}
          />

          {/* History Sections - Scrollable Container */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2">
        {/* Show only relevant history based on current page */}
      {currentPage === 'chat' && (
        <div>
          <div className="flex items-center gap-3 text-sm text-gray-500 font-semibold mb-2 px-2">
            <MessageCircle className="w-4 h-4" />
            <span>Chats History</span>
          </div>
          <ul className={`space-y-1 ${showAllChats ? 'max-h-[calc(100vh-20rem)] overflow-y-auto overflow-x-hidden pr-1' : ''}`} style={{scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent'}}>
            {(showAllChats ? chatList : chatList.slice(0, 10)).map((item) => (
              <li key={item.id} className="group relative">
                {renamingId === item.id ? (
                  <input
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameChat(item.id, renameInput);
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
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="flex items-center gap-3 flex-1 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer min-w-0"
                      onClick={() => handleSelectChat(item.id)}
                      title={item.title || "Untitled Chat"}
                    >
                      <div className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate text-sm text-gray-700">
                        {item.title || "Untitled Chat"}
                      </span>
                    </span>
                    <div
                      className={`flex items-center cursor-pointer dropdown-trigger opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0 ${showAllChats ? 'ml-0 mr-0' : 'ml-2'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
                        setMenuOpenId(item.id === menuOpenId ? null : item.id);
                      }}
                    >
                      <span className="text-gray-400 hover:text-gray-600 text-lg font-bold px-1">⋯</span>
                    </div>
                  </div>
                )}
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
              className="text-xs text-gray-500 mt-1 hover:bg-gray-100 hover:text-gray-700 flex items-center py-1 rounded gap-3 px-2"
            >
              <div className="w-4 h-4 flex-shrink-0">
                <Ellipsis className="w-4 h-4" />
              </div>
              <span>
                {showAllChats ? 'Show less' : 'See more'}
              </span>
            </button>
          )}
        </div>
      )}

      {currentPage === 'questionnaire' && (
        <div>
          <div className="flex items-center gap-3 text-sm text-gray-500 font-semibold mb-2 px-2">
            <FileText className="w-4 h-4" />
            <span>Questionnaires History</span>
          </div>
          <ul className={`space-y-1 ${showAllQuestionnaires ? 'max-h-[calc(100vh-20rem)] overflow-y-auto overflow-x-hidden pr-1' : ''}`} style={{scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent'}}>
            {(showAllQuestionnaires ? questionnaireList : questionnaireList.slice(0, 10)).map((item) => (
              <li key={item.id} className="group relative">
                {renamingQuestionnaireId === item.id ? (
                  <input
                    value={renameQuestionnaireInput}
                    onChange={(e) => setRenameQuestionnaireInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameQuestionnaire(item.id, renameQuestionnaireInput);
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
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="flex items-center gap-3 flex-1 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer min-w-0"
                      onClick={() => handleSelectQuestionnaire(item.id)}
                      title={item.title || "Untitled Questionnaire"}
                    >
                      <div className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate text-sm text-gray-700">
                        {item.title || "Untitled Questionnaire"}
                      </span>
                    </span>
                    <div
                      className={`flex items-center cursor-pointer dropdown-trigger opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0 ${showAllQuestionnaires ? 'ml-0 mr-0' : 'ml-2'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
                        setMenuOpenId(item.id === menuOpenId ? null : item.id);
                      }}
                    >
                      <span className="text-gray-400 hover:text-gray-600 text-lg font-bold px-1">⋯</span>
                    </div>
                  </div>
                )}
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
              className="text-xs text-gray-500 mt-1 hover:bg-gray-100 hover:text-gray-700 flex items-center py-1 rounded gap-3 px-2"
            >
              <div className="w-4 h-4 flex-shrink-0">
                <Ellipsis className="w-4 h-4" />
              </div>
              <span>
                {showAllQuestionnaires ? 'Show less' : 'See more'}
              </span>
            </button>
          )}
        </div>
      )}
          </div>
        </>
      )}
    </div>
  );
};

export default AppSidebar;
