import React, { useState, useEffect } from 'react';
import {
  Send, Upload, RefreshCw, Search, Bot, User,
  MessageCircle, FileText, TrendingUp, Clock
} from 'lucide-react';

const API_BASE = "https://ragtool-backend.onrender.com";
const F24_BLUE = "#00B4F1";
const F24_ACCENT = "#0077C8";

const CustomerSupportAI = () => {
  const [tab, setTab] = useState('chat');
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('F24 QA Expert');
  const [file, setFile] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [stats, setStats] = useState({
    totalQueries: 275,
    avgResponseTime: '1.5s',
    accuracy: 94,
    documentsProcessed: 1250,
    websitesCrawled: 25
  });

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', content: userInput }]);
    setUserInput('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userInput, mode })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.answer || 'No answer returned.' }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error fetching answer.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => setFile(e.target.files[0]);

  const handleProcessFile = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/answer-questionnaire`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    setBatchResults(data.questions_and_answers || []);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 300);
    await fetch(`${API_BASE}/sync-knowledge`, { method: 'POST' });
    setTimeout(() => setIsSyncing(false), 3500);
  };

  const StatCard = ({ icon: Icon, label, value, trend, color }) => (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-4 flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
      </div>
      <div className={`p-2 rounded-full text-white`} style={{ backgroundColor: color }}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6 font-sans">
      <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg text-white" style={{ backgroundColor: F24_BLUE }}><Bot /></div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: F24_BLUE }}>AI Support Assistant</h1>
            <p className="text-sm text-gray-500">Customer Questionnaire Helper</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          System Online
          <User className="ml-2 text-gray-400" />
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={MessageCircle} label="Total Queries Today" value={stats.totalQueries} trend="+12% from yesterday" color={F24_BLUE} />
        <StatCard icon={Clock} label="Avg Response Time" value={stats.avgResponseTime} trend="-0.3s improved" color={F24_ACCENT} />
        <StatCard icon={TrendingUp} label="Accuracy Rate" value={`${stats.accuracy}%`} trend="+2% this week" color="#9966CC" />
        <StatCard icon={FileText} label="KB Documents" value={stats.documentsProcessed} trend="Updated 2hrs ago" color="#F59E0B" />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-6 border-b border-gray-200 mb-4">
        {['chat', 'upload'].map(name => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={`pb-2 px-1 border-b-2 transition font-medium ${tab === name ? 'border-[#00B4F1] text-[#00B4F1]' : 'border-transparent text-gray-500 hover:text-[#00B4F1]'}`}
          >
            {name === 'chat' ? 'Smart Chat Assistant' : 'Batch Processing'}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700">AI Mode:</label>
            <div className="mt-2 flex gap-2">
              {['AI Assistant', 'Expert Knowledge', 'Policy Lookup'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${mode === m ? 'bg-[#00B4F1] text-white' : 'bg-white border text-gray-600'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 overflow-y-auto space-y-2">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`text-sm max-w-[75%] px-4 py-2 rounded-xl ${msg.role === 'user' ? 'ml-auto bg-[#00B4F1] text-white' : 'bg-gray-100 text-gray-800'}`}>{msg.content}</div>
            ))}
            {isLoading && <div className="text-sm bg-gray-200 px-3 py-2 rounded w-max animate-pulse">AI is thinking...</div>}
          </div>
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <input
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything..."
                className="w-full border rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4F1]"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!userInput.trim()}
              className="bg-[#00B4F1] text-white px-4 py-2 rounded-lg hover:shadow-md disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {tab === 'upload' && (
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4 text-[#00B4F1]">Batch Questionnaire Processing</h2>
          <p className="text-gray-500 mb-4">Upload multiple questionnaires for automated AI-powered responses</p>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
            <Upload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
            <p className="text-gray-600 mb-4">Drop files here or click to browse</p>
            <input type="file" accept=".xlsx,.pdf,.docx" onChange={handleFileUpload} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="inline-block bg-[#00B4F1] text-white px-4 py-2 rounded-md cursor-pointer">Choose Files</label>
          </div>
          {file && (
            <button
              onClick={handleProcessFile}
              className="mt-4 bg-[#0077C8] text-white px-4 py-2 rounded-lg hover:shadow-md"
            >
              Process Questionnaire
            </button>
          )}
          <div className="mt-6 space-y-3">
            {batchResults.map((item, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg border">
                <p className="text-sm font-medium text-gray-700">Q: {item.question}</p>
                <p className="text-sm mt-1 text-gray-800">A: {item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync footer */}
      <div className="bg-white p-6 rounded-xl shadow text-sm text-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-[#00B4F1]">Knowledge Base Management</h3>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-gradient-to-r from-[#00B4F1] to-[#0077C8] text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            {isSyncing ? 'Syncing...' : 'Sync Knowledge Base'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#f9fafb] p-4 rounded-lg">
            <p className="text-sm font-semibold">Documents</p>
            <p>{stats.documentsProcessed} indexed</p>
          </div>
          <div className="bg-[#f9fafb] p-4 rounded-lg">
            <p className="text-sm font-semibold">Websites</p>
            <p>{stats.websitesCrawled} crawled</p>
          </div>
        </div>
        {isSyncing && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 h-3 rounded-full">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${syncProgress.toFixed(0)}%`, backgroundColor: F24_BLUE }}
              ></div>
            </div>
            <p className="mt-2 text-center text-xs text-gray-600">Sync Progress: {syncProgress.toFixed(0)}%</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSupportAI;
