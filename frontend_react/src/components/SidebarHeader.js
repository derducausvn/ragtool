import React from 'react';
import { Bot, ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';

const SidebarHeader = ({ sidebarCollapsed, setSidebarCollapsed }) => {
  return (
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
  );
};

export default SidebarHeader;
