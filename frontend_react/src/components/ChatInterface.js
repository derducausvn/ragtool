import React, { useRef, useEffect } from 'react';
import { Bot, Send, Search } from 'lucide-react';

const ChatInterface = ({
  chatHistory,
  userInput,
  setUserInput,
  isLoading,
  mode,
  onSendMessage,
  onStartNewChat
}) => {
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSendMessage();
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-[#00B4F1] mb-4">Chat & Ask</h2>
      <p className="text-gray-400 text-sm mb-6">
        Interact with our AI assistant in either F24 QA Expert mode or General Chat mode.
      </p>
      
      {/* Chat Messages Area */}
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
          <div
            key={i}
            className={`text-sm w-fit max-w-[75%] px-4 py-2 rounded-xl ${
              msg.role === 'user'
                ? 'ml-auto btn-primary text-white'
                : 'bg-white text-gray-800 border border-gray-200'
            }`}
            style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}
          >
            {msg.content}
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
          onClick={onStartNewChat}
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
            onKeyDown={handleKeyDown}
            placeholder={mode === 'General Chat' ? "Ask me anything..." : "Ask about F24..."}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4F1]"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
        <button
          onClick={onSendMessage}
          disabled={!userInput.trim()}
          className="btn-primary text-white px-4 py-2 rounded-lg hover:shadow-md disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
