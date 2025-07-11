import React from 'react';
import { MessageCircle, FileText, Ellipsis } from 'lucide-react';
import DropdownPortal from './DropdownPortal';

const AppSidebar = ({ 
  sidebarCollapsed, 
  currentPage, 
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
  if (sidebarCollapsed) return null;

  return (
    <div className="flex flex-col gap-4">
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
  );
};

export default AppSidebar;
