import React from 'react';
import { MessageCircle, FileText, Upload, TrendingUp, Users, Database, Home } from 'lucide-react';

const DashboardPage = ({ 
  setCurrentPage, 
  chatList, 
  questionnaireList, 
  uploadedKnowledgeFiles 
}) => {
  const stats = [
    {
      title: 'Chat Sessions',
      value: chatList.length,
      icon: MessageCircle,
      gradient: 'from-blue-400 via-blue-500 to-cyan-400',
      action: () => setCurrentPage('chat'),
      description: 'Active chat conversations'
    },
    {
      title: 'Questionnaires',
      value: questionnaireList.length,
      icon: FileText,
      gradient: 'from-green-400 via-green-500 to-emerald-400',
      action: () => setCurrentPage('questionnaire'),
      description: 'Processed questionnaires'
    },
    {
      title: 'Knowledge Files',
      value: uploadedKnowledgeFiles.length,
      icon: Database,
      gradient: 'from-purple-400 via-purple-500 to-fuchsia-400',
      action: () => setCurrentPage('knowledge'),
      description: 'Knowledge base documents'
    }
  ];

  const quickActions = [
    {
      title: 'Start New Chat',
      description: 'Begin a conversation with AI assistant',
      icon: MessageCircle,
      action: () => setCurrentPage('chat')
    },
    {
      title: 'Upload Questionnaire',
      description: 'Process a new customer questionnaire',
      icon: FileText,
      action: () => setCurrentPage('questionnaire')
    },
    {
      title: 'Manage Knowledge Base',
      description: 'Upload files or scan websites',
      icon: Upload,
      action: () => setCurrentPage('knowledge')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Dashboard Section */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-[#00B4F1] mb-4">Dashboard</h2>
        <p className="text-gray-400 text-sm mb-6">
          Welcome to your AI-powered customer support assistant. Overview of your chats, questionnaires, and knowledge base.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div 
              key={index}
              onClick={stat.action}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#00B4F1] hover:shadow-sm transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 group-hover:text-[#00B4F1] transition">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="bg-gray-50 rounded-lg p-4 text-left border border-gray-200 hover:border-[#00B4F1] hover:shadow-sm transition group"
            >
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 btn-primary rounded-lg flex items-center justify-center mr-3">
                  <action.icon className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 group-hover:text-[#00B4F1] transition">
                  {action.title}
                </h4>
              </div>
              <p className="text-xs text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</h3>
        <div className="space-y-3">
          {chatList.length > 0 && (
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <MessageCircle className="w-4 h-4 mr-3 text-blue-500" />
              <span>Latest chat: <strong>"{chatList[0]?.title || 'Untitled'}"</strong></span>
            </div>
          )}
          {questionnaireList.length > 0 && (
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <FileText className="w-4 h-4 mr-3 text-green-500" />
              <span>Latest questionnaire: <strong>"{questionnaireList[0]?.title || 'Untitled'}"</strong></span>
            </div>
          )}
          {uploadedKnowledgeFiles.length > 0 && (
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <Database className="w-4 h-4 mr-3 text-purple-500" />
              <span>Knowledge base contains <strong>{uploadedKnowledgeFiles.length} files</strong></span>
            </div>
          )}
          {chatList.length === 0 && questionnaireList.length === 0 && uploadedKnowledgeFiles.length === 0 && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
              <Home className="mx-auto w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No recent activity.</p>
              <p className="text-xs text-gray-400 mt-1">Start by creating a new chat or uploading a questionnaire.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
