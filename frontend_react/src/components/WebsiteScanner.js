import React from 'react';
import { Search } from 'lucide-react';

const WebsiteScanner = ({
  websiteUrl,
  setWebsiteUrl,
  maxPages,
  setMaxPages,
  isScanning,
  websiteScanStatus,
  crawlProgress,
  onWebsiteScan
}) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Website Content Scan</h3>
      <div className="border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-6 h-6 text-[#00B4F1]" />
          <div>
            <p className="text-gray-600">Scan and import website content</p>
            <p className="text-xs text-gray-400">Enter a website URL to crawl and add its content to the knowledge base</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="Enter website URL (e.g., https://example.com)"
              className={`flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4F1] ${
                isScanning ? 'opacity-50' : ''
              }`}
              disabled={isScanning}
            />
            
            <input
              type="number"
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value)}
              placeholder="Pages to crawl (1-20)"
              min="1"
              max="20"
              className={`w-48 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4F1] ${
                isScanning ? 'opacity-50' : ''
              }`}
              disabled={isScanning}
            />
            
            <button
              onClick={onWebsiteScan}
              disabled={isScanning}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition whitespace-nowrap btn-primary text-white hover:shadow-md ${
                isScanning ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isScanning && (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l5-5-5-5v4a10 10 0 00-10 10h4z" />
                </svg>
              )}
              {isScanning ? 'Scanning Website...' : 'Scan Website'}
            </button>
          </div>
          
          {websiteScanStatus && (
            <div className={`text-sm px-4 py-2 rounded-lg border ${
              websiteScanStatus.type === 'success' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {String(websiteScanStatus.message || '')}
            </div>
          )}
          
          {crawlProgress.length > 0 && (
            <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-40 overflow-y-auto">
              <div className="font-medium text-blue-800 mb-2">Pages Found:</div>
              <div className="space-y-1 font-mono text-xs">
                {crawlProgress.map((message, index) => (
                  <div key={index} className="text-blue-700">
                    {message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebsiteScanner;
