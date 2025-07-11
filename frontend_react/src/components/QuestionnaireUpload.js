import React from 'react';
import { Upload } from 'lucide-react';

const QuestionnaireUpload = ({
  file,
  isProcessing,
  onFileUpload,
  onProcessFile
}) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Questionnaire Upload</h3>
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
        <Upload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
        <p className="text-center text-gray-600 mb-4">
          Select one questionnaire at a time and generate answers
        </p>
        <p className="text-xs text-gray-400 text-center mb-4">
          Supported formats: XLSX, PDF, DOCX
        </p>
        
        <div className="flex flex-col items-center gap-3">
          <input 
            type="file" 
            accept=".xlsx,.pdf,.docx" 
            onChange={onFileUpload} 
            className="hidden" 
            id="questionnaire-upload-input" 
            disabled={isProcessing} 
          />
          <label 
            htmlFor="questionnaire-upload-input" 
            className={`inline-block text-white px-6 py-2 rounded-lg cursor-pointer transition ${
              isProcessing 
                ? 'btn-primary-disabled' 
                : 'btn-primary-hover'
            }`}
          >
            Choose File to Upload
          </label>
          
          {file && (
            <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border max-w-full">
              <strong>Selected:</strong>
              <div className="mt-1">
                <div className="text-xs text-gray-600 truncate">
                  • {file.name}
                </div>
              </div>
            </div>
          )}
          
          {file && (
            <button
              onClick={onProcessFile}
              disabled={isProcessing}
              className={`flex items-center gap-2 text-white px-6 py-2 rounded-lg transition ${
                isProcessing 
                  ? 'btn-primary-disabled opacity-60' 
                  : 'btn-primary-hover'
              }`}
            >
              {isProcessing && (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l5-5-5-5v4a10 10 0 00-10 10h4z" />
                </svg>
              )}
              {isProcessing ? 'Finding answers to questionnaire…' : 'Generate Answers'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireUpload;
