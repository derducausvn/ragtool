// src/components/QuestionnairePanel.jsx
import React from 'react';
import { Upload } from 'lucide-react';
import useQuestionnaire from '../hooks/useQuestionnaire';

/**
 * UI component for handling questionnaire upload and displaying results.
 * Uses useQuestionnaire hook for backend logic.
 */
const QuestionnairePanel = () => {
  const {
    file,
    setFile,
    isProcessing,
    questionnaireResults,
    batchResults,
    handleProcessFile
  } = useQuestionnaire();

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      {/* Title & Description */}
      <h3 className="text-lg font-semibold mb-2 text-[#00B4F1]">Questionnaires Bulk Answering</h3>
      <p className="text-gray-400 text-sm mb-4">
        Upload new questionnaires and get responses generated automatically.
      </p>

      {/* File Upload UI */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
        <Upload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
        <p className="text-xs text-gray-400 mb-4">Limit 200MB per file • XLSX, PDF, DOCX</p>
        <input
          type="file"
          accept=".xlsx,.pdf,.docx"
          onChange={(e) => setFile(e.target.files[0])}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="file-upload"
          className={`inline-block bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white px-4 py-2 rounded-lg cursor-pointer hover:shadow-md ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Choose File
        </label>
      </div>

      {/* Show uploaded filename */}
      {file && (
        <div className="mt-4 text-sm text-gray-700">
          <strong>Uploaded:</strong> {file.name}
        </div>
      )}

      {/* Process Button */}
      {file instanceof File && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleProcessFile}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white px-6 py-2 rounded-lg hover:shadow-md disabled:opacity-60"
          >
            {isProcessing ? 'Processing…' : 'Generate Answers'}
          </button>
        </div>
      )}

      {/* Display results */}
      <div className="mt-6 space-y-3">
        {(questionnaireResults.length > 0 ? questionnaireResults : batchResults).map((item, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                <p className="text-sm font-medium text-gray-700">{item.question}</p>
                <p className="text-sm mt-1 text-gray-800">{item.answer}</p>
            </div>
        ))}

      </div>
    </div>
  );
};

export default QuestionnairePanel;
