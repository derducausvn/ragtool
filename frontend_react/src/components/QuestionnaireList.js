import React from "react";
// import { FileText, Ellipsis } from "../icons";

const QuestionnaireList = ({
  questionnaireList,
  showAllQuestionnaires,
  setShowAllQuestionnaires,
  renamingQuestionnaireId,
  renameQuestionnaireInput,
  setRenameQuestionnaireInput,
  handleSelectQuestionnaire,
  menuOpenId,
  dropdownPosition,
  DropdownPortal,
  openDeleteModal,
  setRenamingQuestionnaireId,
  handleRenameQuestionnaire
}) => (
  <div>
    <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold mb-1 px-2">
      {/* <FileText className="w-3 h-3" /> */}
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
                if (e.key === 'Escape') setRenamingQuestionnaireId(null);
              }}
              onBlur={() => setRenamingQuestionnaireId(null)}
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
              const rect = e.currentTarget.getBoundingClientRect();
              DropdownPortal({
                position: { top: rect.bottom, left: rect.left },
                children: null
              });
            }}
          >
            <span className="text-gray-400 hover:text-gray-600">⋯</span>
          </div>
          {menuOpenId === item.id && dropdownPosition && (
            <DropdownPortal position={dropdownPosition}>
              <div className="bg-white shadow-lg border rounded-md text-sm">
                <button
                  className="block w-full px-3 py-1 text-left hover:bg-gray-100"
                  onClick={() => setRenamingQuestionnaireId(item.id)}
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
        <span className="pl-2 pr-1">{/* <Ellipsis className="w-4 h-4" /> */}…</span>
        <span className="pl-1 pr-4">
          {showAllQuestionnaires ? 'Show less' : 'See more'}
        </span>
      </button>
    )}
  </div>
);

export default QuestionnaireList;
