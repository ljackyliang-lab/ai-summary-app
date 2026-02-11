'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabaseClient';
import { DocumentFile } from './lib/types';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';

export default function Home() {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        fetchFiles();
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

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

      if (storageError) throw new Error(`Storage Error: ${storageError.message}`);

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Insert into Database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Inserting document for user:', user.id);

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
            user_id: user.id,
          },
        ])
        .select()
        .single(); // Ensure we get the inserted object back

      if (dbError) throw new Error(`Database Error: ${dbError.message} (User ID: ${user.id})`);

      // Refresh file list
      await fetchFiles();
      
      // Auto-trigger summary generation
      if (dbData) {
        // We format it to match DocumentFile interface
        const newFile: DocumentFile = {
          id: dbData.id,
          name: dbData.name,
          type: dbData.type as 'pdf' | 'video',
          url: dbData.url,
          uploadDate: new Date(dbData.created_at).toLocaleDateString(),
          summary: dbData.summary,
          status: dbData.status as 'processing' | 'ready' | 'error',
        };
        handleGenerateSummary(newFile);
      }

      alert('Upload successful!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Upload failed:', errorMessage);
      alert('Upload failed: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSummary = async (file: DocumentFile) => {
    // Optimistic update
    const updateStatus = (status: 'processing' | 'ready' | 'error', summary?: string) => {
      setFiles(prevFiles => prevFiles.map(f => 
        f.id === file.id ? { ...f, status, summary } : f
      ));
      if (selectedFile?.id === file.id) {
        setSelectedFile(prev => prev ? { ...prev, status, summary } : null);
      }
    };

    updateStatus('processing');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: file.url, fileType: file.type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      // Update Database
      const { error: dbError } = await supabase
        .from('documents')
        .update({ summary: data.summary, status: 'ready' })
        .eq('id', file.id);

      if (dbError) throw dbError;

      updateStatus('ready', data.summary);
      
    } catch (error: unknown) {
      console.error('Summary generation failed:', error);
      updateStatus('error', 'Failed to generate summary. Please try again.');
      alert('Summary generation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar 
        files={files}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        onUpload={uploadFile}
        onLogout={handleLogout}
        uploading={uploading}
      />
      <MainContent 
        selectedFile={selectedFile}
        onGenerateSummary={handleGenerateSummary}
      />
    </div>
  );
}
