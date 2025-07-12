import React from 'react';
import { Bot, Search, Send, Upload } from 'lucide-react';
import KnowledgeFileUpload from "./KnowledgeFileUpload";
import WebsiteScanner from "./WebsiteScanner";
import KnowledgeFileList from "./KnowledgeFileList";

const ChatPage = ({ 
  mode, 
  setMode, 
  chatHistory, 
  isLoading, 
  userInput, 
  setUserInput, 
  handleSendMessage, 
  startNewChat,
  chatEndRef 
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-[#00B4F1] mb-4">Chat & Ask</h2>
        <p className="text-gray-400 text-sm mb-6">Interact with our AI assistant in either F24 QA Expert mode or General Chat mode.</p>
        
        {/* AI Mode Selection - Integrated at top */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {['F24 QA Expert', 'General Chat'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  mode === m
                    ? 'btn-primary text-white shadow'
                    : 'bg-white border border-gray-300 text-gray-600 hover:border-[#00B4F1]'
                }`}
              >
                {m === 'General Chat' ? 'General Assistant' : 'F24 QA Expert'}
              </button>
            ))}
          </div>
        </div>

        {/* Chat History */}
        <div className="h-80 overflow-y-auto space-y-2 px-1 mb-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
          {chatHistory.length === 0 && !isLoading && (
            <div className="text-center text-gray-400 mt-12">
              <Bot className="mx-auto w-8 h-8 mb-2" />
              <p className="text-sm">
                {mode === 'General Chat'
                  ? "Ask me anything, I'm your general assistant!"
                  : "Ask me anything, I will answer on behalf of F24!"}
              </p>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className="space-y-0.5">
              <div
                className={`text-sm w-fit max-w-[75%] px-4 py-2 rounded-xl ${
                  msg.role === 'user'
                    ? 'ml-auto btn-primary text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
                style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}
              >
                {msg.content}
              </div>
              {msg.role !== 'user' && (msg.mode || msg.mode === '') && (
                <div className="text-xs text-gray-400 mt-0.5 ml-1">
                  {msg.mode === 'F24 QA Expert' ? 'Expert Mode' : 'General Mode'}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="bg-gray-200 text-sm px-4 py-2 rounded-lg w-fit animate-pulse">...</div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-3">
          <button
            onClick={startNewChat}
            title="Start a new chat session"
            className="flex items-center gap-2 text-sm font-medium text-white btn-primary px-4 py-2 rounded-lg hover:shadow-md whitespace-nowrap"
          >
            <Bot className="w-4 h-4" />
            New Chat
          </button>
          <div className="relative flex-1">
            <input
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder={mode === 'General Chat' ? "Ask me anything..." : "Ask about F24..."}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4F1]"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!userInput.trim()}
            className="btn-primary text-white px-4 py-2 rounded-lg hover:shadow-md disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionnairePage = ({ 
  file, 
  isProcessing, 
  handleFileUpload, 
  handleProcessFile, 
  questionnaireResults, 
  batchResults 
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md mb-6">
      <h2 className="text-2xl font-bold text-[#00B4F1] mb-4">Customer Questionnaires</h2>
      <p className="text-gray-400 text-sm mb-6">Upload new customer questionnaires and get responses generated automatically.</p>

      {/* Questionnaire Upload Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Questionnaire Upload</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
        <Upload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
        <p className="text-center text-gray-600 mb-4">Select one questionnaire at a time and generate answers</p>
        <p className="text-xs text-gray-400 text-center mb-4">Supported formats: XLSX, PDF, DOCX</p>
        
        <div className="flex flex-col items-center gap-3">
          <input 
            type="file" 
            accept=".xlsx,.pdf,.docx" 
            onChange={handleFileUpload} 
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
          
          {/* Selected file display */}
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
          
          {/* Generate button */}
          {file && (
            <button
              onClick={handleProcessFile}
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
      
      <div className="mt-6 space-y-3">
        {(questionnaireResults.length > 0 ? questionnaireResults : batchResults).map((item, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded-lg border">
            <p className="text-sm font-medium text-gray-700">{item.question}</p>
            <div className="text-sm mt-1 text-gray-800 whitespace-pre-line">
              {item.answer.split('\n').map((line, i) =>
                line.trim().startsWith('-') ? (
                  <div key={i} style={{ marginLeft: 12 }}>{line}</div>
                ) : (
                  <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

const KnowledgePage = ({ 
  knowledgeFiles,
  isUploadingKnowledge,
  knowledgeUploadStatus,
  handleKnowledgeFileUpload,
  handleKnowledgeFileSubmit,
  websiteUrl,
  setWebsiteUrl,
  maxPages,
  setMaxPages,
  isScanning,
  websiteScanStatus,
  crawlProgress,
  handleWebsiteScan,
  uploadedKnowledgeFiles,
  showUploadedFiles,
  setShowUploadedFiles,
  isLoadingFiles,
  isDeletingFile,
  fetchKnowledgeFiles,
  handleKnowledgeFileDelete,
  formatFileSize,
  formatUploadDate
}) => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-[#00B4F1] mb-4">Knowledge Base Management</h2>
        <p className="text-gray-400 text-sm mb-6">Upload documents or scan websites to add to the Knowledge Base for F24 QA Mode and Bulk Answering.</p>
      </div>

      {/* Document Upload Section */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <KnowledgeFileUpload
          knowledgeFiles={knowledgeFiles}
          isUploadingKnowledge={isUploadingKnowledge}
          knowledgeUploadStatus={knowledgeUploadStatus}
          onFileUpload={handleKnowledgeFileUpload}
          onFileSubmit={handleKnowledgeFileSubmit}
        />
      </div>

      {/* Website Scanner Section */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <WebsiteScanner
          websiteUrl={websiteUrl}
          setWebsiteUrl={setWebsiteUrl}
          maxPages={maxPages}
          setMaxPages={setMaxPages}
          isScanning={isScanning}
          websiteScanStatus={websiteScanStatus}
          crawlProgress={crawlProgress}
          onWebsiteScan={handleWebsiteScan}
        />
      </div>

      {/* Uploaded Files List Section */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <KnowledgeFileList
          uploadedKnowledgeFiles={uploadedKnowledgeFiles}
          showUploadedFiles={showUploadedFiles}
          setShowUploadedFiles={setShowUploadedFiles}
          isLoadingFiles={isLoadingFiles}
          isDeletingFile={isDeletingFile}
          onRefreshFiles={fetchKnowledgeFiles}
          onDeleteFile={handleKnowledgeFileDelete}
          formatFileSize={formatFileSize}
          formatUploadDate={formatUploadDate}
        />
      </div>
    </div>
  );
};

export { ChatPage, QuestionnairePage, KnowledgePage };
