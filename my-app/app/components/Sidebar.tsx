import React, { useState } from 'react';
import { DocumentFile } from '../lib/types';

interface SidebarProps {
  files: DocumentFile[];
  selectedFile: DocumentFile | null;
  onFileSelect: (file: DocumentFile) => void;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

export default function Sidebar({ 
  files, 
  selectedFile, 
  onFileSelect, 
  onUpload, 
  uploading 
}: SidebarProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await onUpload(file);
    }
  };

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,video/mp4';
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        await onUpload(target.files[0]);
      }
    };
    input.click();
  };

  return (
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
          onClick={!uploading ? handleUploadClick : undefined}
          onDragOver={!uploading ? handleDragOver : undefined}
          onDragLeave={!uploading ? handleDragLeave : undefined}
          onDrop={!uploading ? handleDrop : undefined}
          className={`
            border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
               <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            <span className="text-sm font-medium text-gray-600">{uploading ? 'Uploading...' : 'Upload file or video'}</span>
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
                onClick={() => onFileSelect(file)}
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
  );
}
