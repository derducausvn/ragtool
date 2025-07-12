import React from 'react';
import { RefreshCw, FileText, Trash2 } from 'lucide-react';

const KnowledgeFileList = ({
  uploadedKnowledgeFiles,
  showUploadedFiles,
  setShowUploadedFiles,
  isLoadingFiles,
  isDeletingFile,
  onRefreshFiles,
  onDeleteFile,
  formatFileSize,
  formatUploadDate
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Uploaded Knowledge Files</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefreshFiles}
            disabled={isLoadingFiles}
            className="flex items-center gap-2 px-3 py-3 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowUploadedFiles(!showUploadedFiles)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-white btn-primary rounded-lg hover:shadow-md"
          >
            {showUploadedFiles ? 'Hide' : 'Show'} Uploaded Files
            <svg 
              className={`w-4 h-4 transition-transform ${showUploadedFiles ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {showUploadedFiles && (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l5-5-5-5v4a10 10 0 00-10 10h4z" />
              </svg>
              <span className="ml-2 text-gray-600">Loading files...</span>
            </div>
          ) : uploadedKnowledgeFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto w-12 h-12 text-gray-300 mb-2" />
              <p>No files uploaded to knowledge base yet.</p>
              <p className="text-sm">Upload some documents above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 mb-3">
                {uploadedKnowledgeFiles.length} file{uploadedKnowledgeFiles.length !== 1 ? 's' : ''} in knowledge base
              </div>
              {uploadedKnowledgeFiles.map((file, index) => (
                <div key={file.id || index} className="flex items-center justify-between bg-white p-3 rounded-lg border hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate" title={file.filename}>
                        {file.filename}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • Uploaded {formatUploadDate(file.created_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteFile(file.id, file.filename)}
                    disabled={isDeletingFile}
                    className="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title={`Delete ${file.filename}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KnowledgeFileList;
