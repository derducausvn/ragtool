import React from 'react';
import { MessageCircle, FileText, Upload } from 'lucide-react';

const NavigationMenu = ({
  currentPage,
  setCurrentPage,
  isUploadingKnowledge,
  isScanning
}) => {
  const menuItems = [
    { id: 'chat', icon: MessageCircle, label: 'Chat & Ask' },
    { id: 'questionnaire', icon: FileText, label: 'Customer Questionnaires' },
    { id: 'knowledge', icon: Upload, label: 'Knowledge Base' }
  ];

  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-gray-500 mb-2 px-2">NAVIGATION</div>
      {menuItems.map(item => (
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
          <item.icon className="w-4 h-4" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default NavigationMenu;
