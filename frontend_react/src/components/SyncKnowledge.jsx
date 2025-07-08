import React from 'react';

/**
 * Footer section showing knowledge base sync stats and a sync button.
 * Props:
 * - stats: { documents: number, websites: number, syncProgress: number }
 * - onSync: function to trigger manual sync
 * - isSyncing: boolean state to indicate syncing in progress
 */
const SyncKnowledge = ({ stats, onSync, isSyncing }) => {
    return (
        <div className="mt-8 border-t pt-6 text-sm text-gray-600">
        {/* Top Section: Sync button and label */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <div>
            <h3 className="text-base font-semibold text-gray-800">Sync Knowledge Base</h3>
            <p className="text-xs text-gray-500 mt-1">
                Keep your knowledge base up to date with new files and web sources.
            </p>
            </div>

            <button
            onClick={onSync}
            disabled={isSyncing}
            className="bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white px-4 py-2 rounded-lg shadow hover:shadow-md disabled:opacity-50"
            >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Indexed Documents</p>
            <p className="text-lg font-semibold text-gray-800">{stats.documents ?? 0}</p>
            </div>
            <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Websites Crawled</p>
            <p className="text-lg font-semibold text-gray-800">{stats.websites ?? 0}</p>
            </div>
        </div>
        </div>
    );
};

export default SyncKnowledge;
