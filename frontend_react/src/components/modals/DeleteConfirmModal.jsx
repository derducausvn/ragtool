import React from 'react';

/**
 * Reusable delete confirmation modal.
 * Props:
 * - visible: boolean (controls visibility)
 * - onClose: function
 * - onConfirm: function
 * - title: string (optional)
 * - description: string (optional)
 */
const DeleteConfirmModal = ({ visible, onClose, onConfirm, title, description }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm animate-fadeIn">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          {title || 'Are you sure?'}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {description || 'This action cannot be undone.'}
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
