// src/components/Sidebar.jsx
import React from 'react';
import { ArrowLeftToLine, ArrowRightToLine, Bot } from 'lucide-react';
import SessionList from './SessionList';

/**
 * Sidebar layout with collapse/expand toggle and grouped session sections.
 */
const Sidebar = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  sections,
  menuOpenId,
  setMenuOpenId,
  dropdownPosition,
  setDropdownPosition
}) => {
  return (
    <div
      className={`transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg p-2 border-r text-sm flex flex-col relative overflow-hidden`}
    >
      {/* Header: Logo + Collapse toggle */}
      <div className="flex items-center justify-between mb-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg text-white bg-[#00B4F1]">
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

      {/* Section lists */}
      {!sidebarCollapsed && (
        <div className="flex flex-col gap-4">
          {sections.map((section, i) => (
            <SessionList
              key={i}
              {...section}
              menuOpenId={menuOpenId}
              setMenuOpenId={setMenuOpenId}
              dropdownPosition={dropdownPosition}
              setDropdownPosition={setDropdownPosition}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
