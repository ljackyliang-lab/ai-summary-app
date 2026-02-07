'use client';

import { useState } from 'react';

// Define document file interface
interface DocumentFile {
  id: string;
  name: string;
  type: 'pdf' | 'video';
  url: string; // URL for preview
  uploadDate: string;
  summary?: string; // AI summary content
  status: 'processing' | 'ready' | 'error';
}

// Mock initial data
const MOCK_FILES: DocumentFile[] = [
  {
    id: '1',
    name: 'Q1_Financial_Report.pdf',
    type: 'pdf',
    url: '#',
    uploadDate: '2023-10-27',
    summary: 'This document covers the Q1 financial results, highlighting a 15% growth in revenue driven by new product launches. Operating expenses increased by 5% due to marketing initiatives.',
    status: 'ready'
  },
  {
    id: '2',
    name: 'Product_Demo.mp4',
    type: 'video',
    url: '#',
    uploadDate: '2023-10-28',
    status: 'processing'
  }
];

export default function Home() {
  const [files, setFiles] = useState<DocumentFile[]>(MOCK_FILES);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle file selection
  const handleFileSelect = (file: DocumentFile) => {
    setSelectedFile(file);
  };

  // Handle drag and drop upload effects
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Logic for actual upload will be implemented here
    alert('File dropped (Upload not implemented yet)');
  };

  // Simulate click upload
  const handleUploadClick = () => {
    // This will trigger hidden input in the future
    alert('Click upload (Not implemented yet)');
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Left sidebar: File list and upload */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            AI DocManager
          </h1>
        </div>

        {/* Upload area */}
        <div className="p-4">
          <div 
            onClick={handleUploadClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
            `}
          >
            <div className="flex flex-col items-center gap-2">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm font-medium text-gray-600">Upload file or video</span>
              <span className="text-xs text-gray-400">Supports PDF, MP4</span>
            </div>
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-2">
          <h2 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">My Files</h2>
          <ul className="space-y-1">
            {files.map((file) => (
              <li key={file.id}>
                <button
                  onClick={() => handleFileSelect(file)}
                  className={`
                    w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors
                    ${selectedFile?.id === file.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}
                  `}
                >
                  <div className={`p-2 rounded-lg ${file.type === 'pdf' ? 'bg-red-100 text-red-500' : 'bg-purple-100 text-purple-500'}`}>
                    {file.type === 'pdf' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{file.uploadDate}</p>
                  </div>
                  {file.status === 'processing' && (
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title="Processing"></div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right main content: Preview and summary */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        {selectedFile ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Top toolbar */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{selectedFile.name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="uppercase px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs font-semibold tracking-wide">{selectedFile.type}</span>
                  <span>•</span>
                  <span>{selectedFile.uploadDate}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm">
                  Download
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Regenerate Summary
                </button>
              </div>
            </header>

            {/* Content area: Left preview, Right summary */}
            <div className="flex-1 flex overflow-hidden">
              {/* File preview area (Left) */}
              <div className="flex-1 bg-gray-100 p-6 overflow-y-auto border-r border-gray-200 flex items-center justify-center">
                <div className="bg-white shadow-lg rounded-lg w-full max-w-3xl h-full min-h-[500px] flex items-center justify-center text-gray-400">
                  {/* PDF Viewer or Video Player will be placed here */}
                  <div className="text-center">
                    {selectedFile.type === 'pdf' ? (
                      <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    ) : (
                      <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    <p className="text-lg font-medium">File Preview</p>
                    <p className="text-sm text-gray-400 mt-1">{selectedFile.name}</p>
                  </div>
                </div>
              </div>

              {/* AI Summary area (Right) */}
              <div className="w-96 bg-white flex flex-col shadow-xl z-20">
                <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    AI Smart Summary
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {selectedFile.status === 'processing' ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-100 rounded w-full"></div>
                      <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                      <div className="flex items-center justify-center pt-10 text-gray-400 text-sm gap-2">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Analyzing content...
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-blue text-gray-600">
                      <p className="leading-relaxed">
                        {selectedFile.summary || "Summary not generated yet."}
                      </p>
                      
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Key Extraction</h4>
                        <div className="flex flex-wrap gap-2">
                          {['Finance', 'Q1 Report', 'Growth'].map(tag => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium border border-gray-200">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ask about the document..." 
                      className="w-full pl-4 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button className="absolute right-2 top-2 text-gray-400 hover:text-blue-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Welcome to AI DocManager</h3>
            <p className="max-w-md text-center text-gray-500">
              Select a document from the left to start previewing and reading the summary, or drag a new file to the left panel to upload.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
