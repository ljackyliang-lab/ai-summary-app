import React from 'react';
import ReactMarkdown from 'react-markdown';
import { DocumentFile } from '../lib/types';

interface MainContentProps {
  selectedFile: DocumentFile | null;
  onGenerateSummary: (file: DocumentFile) => Promise<void>;
  onOpenSettings: () => void;
}

export default function MainContent({ selectedFile, onGenerateSummary, onOpenSettings }: MainContentProps) {
  return (
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
            <div className="flex gap-2 relative z-50">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Settings button clicked');
                  onOpenSettings();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm flex items-center gap-2 relative z-50 pointer-events-auto"
                title="Settings"
                type="button"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button 
                onClick={() => window.open(selectedFile.url, '_blank')}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
              >
                Download
              </button>
              <button 
                onClick={() => onGenerateSummary(selectedFile)}
                disabled={selectedFile.status === 'processing'}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 ${selectedFile.status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {selectedFile.status === 'processing' ? 'Generating...' : 'Regenerate Summary'}
              </button>
            </div>
          </header>

          {/* Content area: Left preview, Right summary */}
          <div className="flex-1 flex overflow-hidden">
            {/* File preview area (Left) */}
            <div className="flex-1 bg-gray-100 p-6 overflow-y-auto border-r border-gray-200 flex items-center justify-center">
              <div className="bg-white shadow-lg rounded-lg w-full max-w-4xl h-full flex flex-col overflow-hidden">
                 <iframe 
                   src={selectedFile.url} 
                   className="w-full h-full border-none"
                   title={selectedFile.name}
                 />
              </div>
            </div>

            {/* AI Summary area (Right) */}
            <div className="w-96 bg-white flex flex-col shadow-xl z-20">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Smart Summary
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
                  <div className="prose prose-sm prose-blue text-gray-600 max-w-none">
                    {selectedFile.summary ? (
                      <ReactMarkdown 
                        components={{
                          h1: ({...props}) => <h1 className="text-xl font-bold text-gray-800 mb-4" {...props} />,
                          h2: ({...props}) => <h2 className="text-lg font-bold text-gray-800 mt-6 mb-3" {...props} />,
                          h3: ({...props}) => <h3 className="text-md font-bold text-gray-800 mt-4 mb-2" {...props} />,
                          p: ({...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                          ul: ({...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                          li: ({...props}) => <li className="text-gray-600" {...props} />,
                          strong: ({...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                        }}
                      >
                        {selectedFile.summary}
                      </ReactMarkdown>
                    ) : (
                      "Summary not generated yet."
                    )}
                    
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      {selectedFile.keywords && selectedFile.keywords.length > 0 && (
                        <>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Key Extraction</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedFile.keywords.map(tag => (
                              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium border border-gray-200">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
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
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Welcome to DocManager</h3>
          <p className="max-w-md text-center text-gray-500">
            Select a document from the left to start previewing and reading the summary, or drag a new file to the left panel to upload.
          </p>
        </div>
      )}
    </main>
  );
}
