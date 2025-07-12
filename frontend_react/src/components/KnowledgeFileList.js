import React, { useState } from 'react';
import { RefreshCw, FileText, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const KnowledgeFileList = ({
  uploadedKnowledgeFiles,
  isLoadingFiles,
  isDeletingFile,
  onRefreshFiles,
  onDeleteFile,
  formatFileSize,
  formatUploadDate
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const filesPerPage = 10;
  
  // Calculate pagination
  const totalFiles = uploadedKnowledgeFiles.length;
  const totalPages = Math.ceil(totalFiles / filesPerPage);
  const startIndex = (currentPage - 1) * filesPerPage;
  const endIndex = startIndex + filesPerPage;
  const currentFiles = uploadedKnowledgeFiles.slice(startIndex, endIndex);
  
  // Reset to page 1 when files list changes significantly
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Uploaded Knowledge Files</h3>
        <button
          onClick={onRefreshFiles}
          disabled={isLoadingFiles}
          className="flex items-center gap-2 px-3 py-3 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

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
            <div className="space-y-4">
              {/* File count and pagination info */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  {totalFiles} file{totalFiles !== 1 ? 's' : ''} in knowledge base
                  {totalPages > 1 && (
                    <span className="ml-2">
                      (Showing {startIndex + 1}-{Math.min(endIndex, totalFiles)} of {totalFiles})
                    </span>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Files table */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="col-span-5">Filename</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-4">Uploaded</div>
                  <div className="col-span-1">Action</div>
                </div>
                <div className="divide-y divide-gray-100">
                  {currentFiles.map((file, index) => (
                    <div key={file.id || index} className="grid grid-cols-12 gap-4 p-3 hover:bg-gray-50 transition-colors">
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="truncate" title={file.filename}>
                          <span className="text-sm font-medium text-gray-900">{file.filename}</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <span className="text-sm text-gray-600">{formatFileSize(file.size)}</span>
                      </div>
                      <div className="col-span-4 flex items-center">
                        <span className="text-sm text-gray-600">{formatUploadDate(file.created_at)}</span>
                      </div>
                      <div className="col-span-1 flex items-center">
                        <button
                          onClick={() => onDeleteFile(file.id, file.filename)}
                          disabled={isDeletingFile}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title={`Delete ${file.filename}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom pagination for large lists */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700 bg-white border rounded">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  );
};

export default KnowledgeFileList;
