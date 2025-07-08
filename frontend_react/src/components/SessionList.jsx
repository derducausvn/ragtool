// src/components/SessionList.jsx
import React, { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import DropdownPortal from './DropdownPortal';
import DeleteConfirmModal from './modals/DeleteConfirmModal';

/**
 * Displays a list of chat or questionnaire sessions with rename/delete actions.
 */
const SessionList = ({
  title,
  icon: Icon,
  items,
  renamingId,
  renameInput,
  onRenameInput,
  onRename,
  onSelect,
  onSetRenamingId,
  showMore,
  showAll,
  setShowAll,
  menuOpenId,
  setMenuOpenId,
  dropdownPosition,
  setDropdownPosition,
  type,
  onDelete
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 font-semibold mb-1 px-2">
        <Icon className="w-4 h-4" />
        <span>{title}</span>
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group relative flex justify-between items-center pr-1">
            {renamingId === item.id ? (
              <input
                value={renameInput}
                onChange={(e) => onRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onRename(item.id);
                  if (e.key === 'Escape') {
                    onSetRenamingId(null);
                    onRenameInput('');
                  }
                }}
                onBlur={() => {
                  onSetRenamingId(null);
                  onRenameInput('');
                }}
                autoFocus
                className="w-full text-sm px-1 py-0.5 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <span
                className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                onClick={() => onSelect(item.id)}
                title={item.title || `Untitled ${title}`}
              >
                <div className="w-4 h-4 flex-shrink-0" />
                <span className="truncate max-w-[170px] text-sm text-gray-700">
                  {item.title || `Untitled ${title}`}
                </span>
              </span>
            )}

            {/* Dropdown trigger */}
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

            {/* Dropdown menu */}
            {menuOpenId === item.id && dropdownPosition && (
              <DropdownPortal position={dropdownPosition}>
                <div className="bg-white shadow-lg border rounded-md text-sm">
                  <button
                    className="block w-full px-3 py-1 text-left hover:bg-gray-100"
                    onClick={() => {
                      onSetRenamingId(item.id);
                      onRenameInput(item.title || '');
                      setMenuOpenId(null);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="block w-full px-3 py-1 text-left text-red-600 hover:bg-red-50"
                    onClick={() => {
                      onDelete(item);;
                      setMenuOpenId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </DropdownPortal>
            )}
          </li>
        ))}
      </ul>

      {/* Show more / less toggle */}
      {showMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-gray-500 mt-1 hover:bg-gray-100 hover:text-gray-700 flex items-center py-1 rounded"
        >
          <span className="pl-2 pr-1">
            <Ellipsis className="w-4 h-4" />
          </span>
          <span className="pl-1 pr-4">{showAll ? 'Show less' : 'See more'}</span>
        </button>
      )}


    </div>
  );
};

export default SessionList;
