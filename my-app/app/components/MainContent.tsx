import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import { DocumentFile } from '../lib/types';
import { PDFViewerHandle } from './PDFViewer';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-full bg-gray-50 animate-pulse rounded"></div>
});

const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

interface MainContentProps {
  selectedFile: DocumentFile | null;
  onGenerateSummary: (file: DocumentFile) => Promise<void>;
  onAnalyzeContent: (content: string, originalFile: DocumentFile) => Promise<void>;
  onUpdateNotes: (fileId: string, notes: string) => Promise<void>;
  onOpenSettings: () => void;
  onBack?: () => void;
}

export default function MainContent({ selectedFile, onGenerateSummary, onAnalyzeContent, onUpdateNotes, onOpenSettings, onBack }: MainContentProps) {
  const pdfViewerRef = useRef<PDFViewerHandle>(null);
  const [isAnalyzingPage, setIsAnalyzingPage] = useState(false);
  const [mobileTab, setMobileTab] = useState<'doc' | 'ai'>('doc');

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'notes'>('summary');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);

  const [isNotesEditing, setIsNotesEditing] = useState(false);
  const [notesContent, setNotesContent] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [textContent, setTextContent] = useState('');

  // Sync notes content when file changes
  React.useEffect(() => {
    if (selectedFile?.user_notes) {
      setNotesContent(selectedFile.user_notes);
    } else {
      setNotesContent('');
    }
    setIsNotesEditing(false);

    // Fetch text content for .txt files
    if (selectedFile?.type === 'txt' || selectedFile?.name.toLowerCase().endsWith('.txt')) {
      fetch(selectedFile.url)
        .then(res => res.text())
        .then(text => setTextContent(text))
        .catch(err => console.error('Failed to load text file:', err));
    } else {
      setTextContent('');
    }
  }, [selectedFile?.id, selectedFile?.user_notes, selectedFile?.url, selectedFile?.type, selectedFile?.name]);

  const handleSaveNotes = async () => {
    if (!selectedFile) return;
    setIsSavingNotes(true);
    try {
      await onUpdateNotes(selectedFile.id, notesContent);
      setIsNotesEditing(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
      alert('Failed to save notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleImportSummary = async () => {
    if (!selectedFile?.summary) {
      alert('No summary available to import.');
      return;
    }
    
    try {
      // Convert Markdown to HTML
      const html = await marked.parse(selectedFile.summary);
      
      // Append to existing notes or set as new notes
      const newContent = notesContent 
        ? `${notesContent}<br/><hr/><br/>${html}` 
        : html;
        
      setNotesContent(newContent);
      setIsNotesEditing(true);
    } catch (error) {
      console.error('Failed to convert summary:', error);
      alert('Failed to import summary.');
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !selectedFile) return;

    setIsAsking(true);
    setActiveTab('chat'); // Switch to chat tab when asking
    
    // Add user message immediately
    const userMessage = { role: 'user' as const, content: question };
    setChatHistory(prev => [...prev, userMessage]);
    
    try {
      // For now, we reuse the summarize API but with a specific prompt
      // Ideally, this should be a separate 'chat' endpoint
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: selectedFile.url,
          fileType: selectedFile.type,
          customPrompt: question, // Send raw question
          mode: 'qa', // Explicitly set QA mode
          language: 'English' // Or user preference
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      // Add AI response
      setChatHistory(prev => [...prev, { role: 'ai', content: data.summary }]);
      setQuestion('');
    } catch (error) {
      console.error('Failed to get answer:', error);
      setChatHistory(prev => [...prev, { role: 'ai', content: 'Sorry, I failed to get an answer. Please try again.' }]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleAnalyzePage = async () => {
    if (!pdfViewerRef.current || !selectedFile) return;
    
    setIsAnalyzingPage(true);
    try {
      const text = await pdfViewerRef.current.getCurrentPageText();
      if (!text || text.trim().length === 0) {
        alert('No text found on this page.');
        return;
      }
      await onAnalyzeContent(text, selectedFile);
    } catch (error) {
      console.error('Failed to analyze page:', error);
      alert('Failed to analyze page content.');
    } finally {
      setIsAnalyzingPage(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
      {selectedFile ? (
        <div className="flex-1 flex flex-col h-full">
          {/* Top toolbar */}
          <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-3">
              {/* Mobile Back Button */}
              {onBack && (
                <button 
                  onClick={onBack}
                  className="md:hidden p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  aria-label="Back to file list"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-800 truncate max-w-[200px] md:max-w-md">{selectedFile.name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="uppercase px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs font-semibold tracking-wide">{selectedFile.type}</span>
                  <span>•</span>
                  <span>{selectedFile.uploadDate}</span>
                </div>
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
                className="px-3 py-2 md:px-4 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
                title="Download"
              >
                <span className="hidden md:inline">Download</span>
                <span className="md:hidden">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </span>
              </button>
              <button 
                onClick={handleAnalyzePage}
                disabled={isAnalyzingPage || selectedFile.status === 'processing' || selectedFile.type !== 'pdf'}
                className={`px-3 py-2 md:px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm flex items-center gap-2 ${(isAnalyzingPage || selectedFile.status === 'processing' || selectedFile.type !== 'pdf') ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Analyze Page"
              >
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <span className="hidden md:inline">{isAnalyzingPage ? 'Analyzing...' : 'Analyze Page'}</span>
              </button>
              <button 
                onClick={() => onGenerateSummary(selectedFile)}
                disabled={selectedFile.status === 'processing'}
                className={`px-3 py-2 md:px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 ${selectedFile.status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Regenerate Summary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                <span className="hidden md:inline">{selectedFile.status === 'processing' ? 'Generating...' : 'Regenerate'}</span>
              </button>
            </div>
          </header>

          {/* Content area: Left preview, Right summary */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex border-b border-gray-200 bg-white shrink-0">
              <button 
                className={`flex-1 py-3 text-sm font-medium ${mobileTab === 'doc' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => setMobileTab('doc')}
              >
                Document
              </button>
              <button 
                className={`flex-1 py-3 text-sm font-medium ${mobileTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => setMobileTab('ai')}
              >
                AI Summary & Chat
              </button>
            </div>

            {/* File preview area (Left) */}
            <div className={`flex-1 bg-gray-100 p-2 md:p-6 overflow-y-auto border-r border-gray-200 flex items-center justify-center relative ${mobileTab === 'doc' ? 'block' : 'hidden md:flex'}`}>
              <div className="bg-white shadow-lg rounded-lg w-full max-w-4xl h-full flex flex-col overflow-hidden relative z-0">
                 {selectedFile.type === 'pdf' || selectedFile.url.toLowerCase().endsWith('.pdf') ? (
                   <PDFViewer 
                     ref={pdfViewerRef}
                     url={selectedFile.url}
                   />
                 ) : (selectedFile.type === 'txt' || selectedFile.name.toLowerCase().endsWith('.txt')) ? (
                   <div className="w-full h-full overflow-auto p-8 bg-white font-mono text-sm whitespace-pre-wrap">
                     {textContent || 'Loading text...'}
                   </div>
                 ) : (
                   <iframe 
                     src={selectedFile.url} 
                     className="w-full h-full border-none"
                     title={selectedFile.name}
                   />
                 )}
              </div>
            </div>

            {/* AI Summary/Chat area (Right) */}
            <div className={`w-full md:w-96 bg-white flex flex-col shadow-xl z-20 ${mobileTab === 'ai' ? 'block flex-1' : 'hidden md:flex'}`}>
              <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex">
                  <button 
                    onClick={() => setActiveTab('summary')}
                    className={`flex-1 py-4 text-sm font-bold text-center transition-colors border-b-2 ${activeTab === 'summary' ? 'text-blue-600 border-blue-600 bg-white/50' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Summary
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('notes')}
                    className={`flex-1 py-4 text-sm font-bold text-center transition-colors border-b-2 ${activeTab === 'notes' ? 'text-blue-600 border-blue-600 bg-white/50' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      My Notes
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-4 text-sm font-bold text-center transition-colors border-b-2 ${activeTab === 'chat' ? 'text-blue-600 border-blue-600 bg-white/50' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                      Chat
                    </span>
                  </button>
                </div>
              </div>
              
              <div className={`flex-1 overflow-hidden flex flex-col`}>
                {activeTab === 'summary' ? (
                  <div className="flex-1 overflow-y-auto p-5">
                    {/* Summary View */}
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
                              {(Array.isArray(selectedFile.keywords) 
                                ? selectedFile.keywords 
                                : typeof selectedFile.keywords === 'string'
                                  ? JSON.parse(selectedFile.keywords) // Try parsing if it's a stringified array
                                  : []
                              ).map((tag: string, index: number) => (
                                <span 
                                  key={`${tag}-${index}`} 
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors cursor-default"
                                >
                                  #{tag.replace(/^["']|["']$/g, '').trim()}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  </div>
                ) : activeTab === 'notes' ? (
                  // Notes View
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex justify-end p-5 pb-2 flex-none bg-white z-10">
                       {isNotesEditing ? (
                         <div className="flex gap-2">
                           <button 
                             onClick={() => setIsNotesEditing(false)} 
                             disabled={isSavingNotes}
                             className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
                           >
                             Cancel
                           </button>
                           <button 
                             onClick={handleSaveNotes}
                             disabled={isSavingNotes}
                             className="text-xs px-2 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1"
                           >
                             {isSavingNotes ? 'Saving...' : 'Save'}
                           </button>
                         </div>
                       ) : (
                         <div className="flex gap-2">
                           <button 
                             onClick={handleImportSummary}
                             className="text-xs px-2 py-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 transition-colors"
                             title="Import Summary"
                           >
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8" /></svg>
                             Import Summary
                           </button>
                           <button 
                             onClick={() => setIsNotesEditing(true)}
                             className="text-xs px-2 py-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 transition-colors"
                             title="Edit Notes"
                           >
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                             Edit
                           </button>
                         </div>
                       )}
                    </div>

                    {isNotesEditing ? (
                      <div className="flex-1 p-5 pt-0 overflow-hidden">
                         <ReactQuill 
                           theme="snow"
                           value={notesContent}
                           onChange={setNotesContent}
                           className="h-full" 
                           modules={{
                             toolbar: [
                               [{ 'header': [1, 2, 3, false] }],
                               ['bold', 'italic', 'underline', 'strike'],
                               [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                               ['clean']
                             ],
                           }}
                         />
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto p-5 pt-0">
                        <div className="prose prose-sm prose-blue text-gray-600 max-w-none ql-editor break-words whitespace-pre-wrap !overflow-visible !h-auto" dangerouslySetInnerHTML={{ __html: selectedFile.user_notes || '<p class="text-gray-400 italic">No notes yet. Click Edit to add some notes.</p>' }} />
                      </div>
                    )}
                  </div>
                ) : (
                  // Chat View
                  <div className="flex-1 overflow-y-auto p-5">
                  <div className="space-y-6">
                    {chatHistory.length === 0 ? (
                      <div className="text-center text-gray-400 py-10">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm">Ask anything about this document!</p>
                      </div>
                    ) : (
                      chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div 
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-gray-100 text-gray-700 rounded-bl-none'
                            }`}
                          >
                            {msg.role === 'ai' ? (
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            ) : (
                              msg.content
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {isAsking && (
                      <div className="flex justify-start">
                         <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
                           <div className="flex gap-1">
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                           </div>
                         </div>
                      </div>
                    )}
                  </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="relative">
                  <input 
                    type="text" 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isAsking && handleAskQuestion()}
                    placeholder="Ask about the document..." 
                    disabled={isAsking}
                    className="w-full pl-4 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                  <button 
                    onClick={handleAskQuestion}
                    disabled={isAsking || !question.trim()}
                    className="absolute right-2 top-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-400"
                  >
                    {isAsking ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    )}
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
