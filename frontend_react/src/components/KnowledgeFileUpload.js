import React from 'react';
import { Upload } from 'lucide-react';

const KnowledgeFileUpload = ({
  knowledgeFiles,
  isUploadingKnowledge,
  knowledgeUploadStatus,
  onFileUpload,
  onFileSubmit
}) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Document Upload</h3>
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
        <Upload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
        <p className="text-center text-gray-600 mb-4">Upload documents to the knowledge base</p>
        <p className="text-xs text-gray-400 text-center mb-4">Supported formats: XLSX, PDF, DOCX, TXT</p>
        
        <div className="flex flex-col items-center gap-3">
          <input
            type="file"
            accept=".pdf,.docx,.xlsx,.txt"
            id="knowledge-upload-input"
            className="hidden"
            onChange={onFileUpload}
            disabled={isUploadingKnowledge}
            multiple
          />
          <label 
            htmlFor="knowledge-upload-input" 
            className={`inline-block text-white px-6 py-2 rounded-lg cursor-pointer transition ${
              isUploadingKnowledge 
                ? 'btn-primary-disabled' 
                : 'btn-primary-hover'
            }`}
          >
            Choose File to Upload
          </label>
          
          {knowledgeFiles.length > 0 && (
            <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border max-w-full">
              <strong>Selected ({knowledgeFiles.length} file{knowledgeFiles.length > 1 ? 's' : ''}):</strong>
              <div className="mt-1 max-h-24 overflow-y-auto">
                {knowledgeFiles.map((file, index) => (
                  <div key={index} className="text-xs text-gray-600 truncate">
                    • {file.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {knowledgeFiles.length > 0 && (
            <button
              onClick={onFileSubmit}
              disabled={isUploadingKnowledge}
              className={`flex items-center gap-2 text-white px-6 py-2 rounded-lg transition ${
                isUploadingKnowledge 
                  ? 'btn-primary-disabled opacity-60' 
                  : 'btn-primary-hover'
              }`}
            >
              {isUploadingKnowledge && (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l5-5-5-5v4a10 10 0 00-10 10h4z" />
                </svg>
              )}
              {isUploadingKnowledge ? 'Uploading...' : 'Upload to Knowledge Base'}
            </button>
          )}
          
          {knowledgeUploadStatus && (
            <div className={`text-sm px-4 py-2 rounded-lg border ${
              knowledgeUploadStatus.type === 'success' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : knowledgeUploadStatus.type === 'warning'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {String(knowledgeUploadStatus.message || '')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeFileUpload;
