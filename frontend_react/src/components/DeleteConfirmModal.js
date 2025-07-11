import React from "react";
// Import the X icon if needed, adjust the import path as per your icon setup
// import { X } from "../icons";

const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemTitle,
  itemType = "session",
  customMessage 
}) => {
  if (!isOpen) return null;

  const getDefaultMessage = () => {
    switch (itemType) {
      case 'file':
        return `This will delete the file "${itemTitle || "Untitled File"}" from the knowledge base.`;
      case 'chat':
        return `This will delete the chat "${itemTitle || "Untitled Chat"}".`;
      case 'questionnaire':
        return `This will delete the questionnaire "${itemTitle || "Untitled Questionnaire"}".`;
      default:
        return `This will delete "${itemTitle || "Untitled Session"}".`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Delete {itemType}?
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {/* <X className="w-5 h-5" /> */}
            <span className="w-5 h-5">×</span>
          </button>
        </div>
        <div className="mb-6">
          <p className="text-gray-600">
            {customMessage || (
              <>
                <span className="font-medium">{getDefaultMessage()}</span>
              </>
            )}
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

export default DeleteConfirmModal;
