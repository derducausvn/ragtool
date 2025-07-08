// src/components/ChatPanel.jsx
import React from 'react';
import { Bot, Search, Send } from 'lucide-react';
import useChat from '../hooks/useChat';

const ChatPanel = () => {
  const {
    chatHistory,
    userInput,
    setUserInput,
    isLoading,
    mode,
    setMode,
    handleSendMessage,
    startNewChat
  } = useChat();

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      {/* Header: AI Mode + New Chat */}
      <div className="mb-4 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">AI Mode:</span>
          {['F24 QA Expert', 'General Chat'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                mode === m
                  ? 'bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white shadow'
                  : 'bg-white border text-gray-600 hover:border-[#00B4F1]'
              }`}
            >
              {m === 'General Chat' ? 'General Assistant' : 'F24 QA Expert'}
            </button>
          ))}
        </div>

        <button
          onClick={startNewChat}
          title="Start a new chat"
          className="flex items-center gap-2 text-sm font-medium text-white bg-gradient-to-r from-[#00B4F1] to-[#0077C8] px-4 py-2 rounded-lg hover:shadow-md"
        >
          <Bot className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Chat Bubble Area */}
      <div className="h-80 overflow-y-auto space-y-2 px-1">
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
          <div
            key={i}
            className={`text-sm max-w-[75%] px-4 py-2 rounded-xl ${
              msg.role === 'user'
                ? 'ml-auto bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {msg.content}
          </div>
        ))}

        {isLoading && (
          <div className="bg-gray-200 text-sm px-4 py-2 rounded-lg w-max animate-pulse">...</div>
        )}
      </div>

      {/* Input Field */}
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <input
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask me..."
            className="w-full border border-[#00B4F1] rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4F1]"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>

        <button
          onClick={handleSendMessage}
          disabled={!userInput.trim()}
          className="bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white px-4 py-2 rounded-full hover:shadow-md disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;