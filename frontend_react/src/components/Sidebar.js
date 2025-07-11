import React from "react";

const Sidebar = ({ sidebarCollapsed, setSidebarCollapsed, currentPage, setCurrentPage, isUploadingKnowledge, isScanning }) => {
  return (
    <div className={`transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg p-2 border-r text-sm flex flex-col relative overflow-hidden`}>
      {/* Header Row: Logo + Collapse Button */}
      <div className="flex items-center justify-between mb-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg text-white btn-primary">
              <span className="w-5 h-5">🤖</span>
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
          <span className="w-5 h-5">{sidebarCollapsed ? '→' : '←'}</span>
        </button>
      </div>
      {/* Navigation Menu */}
      {!sidebarCollapsed && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-gray-500 mb-2 px-2">NAVIGATION</div>
          {[
            { id: 'chat', label: 'Chat & Ask' },
            { id: 'questionnaire', label: 'Customer Questionnaires' },
            { id: 'knowledge', label: 'Knowledge Base' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              disabled={isUploadingKnowledge || isScanning}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition ${
                currentPage === item.id
                  ? 'btn-primary text-white'
                  : (isUploadingKnowledge || isScanning)
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
