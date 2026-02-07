'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { DocumentFile } from './lib/types';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';

export default function Home() {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch file list from Supabase
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching files:', error);
    } else if (data) {
      const formattedFiles: DocumentFile[] = data.map((item: {
        id: string;
        name: string;
        type: 'pdf' | 'video';
        url: string;
        created_at: string;
        summary?: string;
        status: 'processing' | 'ready' | 'error';
      }) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        url: item.url,
        uploadDate: new Date(item.created_at).toLocaleDateString(),
        summary: item.summary,
        status: item.status,
      }));
      setFiles(formattedFiles);
    }
  };

  // Handle file selection
  const handleFileSelect = (file: DocumentFile) => {
    setSelectedFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Insert into Database
      const fileType = file.type.includes('pdf') ? 'pdf' : 'video';
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert([
          {
            name: file.name,
            type: fileType,
            url: publicUrl,
            status: 'processing', // Initial status
            summary: '',
          },
        ])
        .select();

      if (dbError) throw dbError;

      // Refresh file list
      await fetchFiles();
      alert('Upload successful!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Upload failed:', errorMessage);
      alert('Upload failed: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar 
        files={files}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        onUpload={uploadFile}
        uploading={uploading}
      />
      <MainContent 
        selectedFile={selectedFile}
      />
    </div>
  );
}
