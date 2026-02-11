'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabaseClient';
import { DocumentFile, AISettings } from './lib/types';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import SettingsModal from './components/SettingsModal';

export default function Home() {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>({
    language: 'English',
    customPrompt: '',
  });
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
        type: 'pdf';
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

      const fileType = 'pdf';
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
          type: dbData.type as 'pdf',
          url: dbData.url,
          uploadDate: new Date(dbData.created_at).toLocaleDateString(),
          summary: dbData.summary,
          status: dbData.status as 'processing' | 'ready' | 'error',
        };
        
        // Automatically select the new file so the user can see the progress
        setSelectedFile(newFile);
        
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
    const updateStatus = (status: 'processing' | 'ready' | 'error', summary?: string, keywords?: string[]) => {
      setFiles(prevFiles => prevFiles.map(f => 
        f.id === file.id ? { ...f, status, summary, keywords } : f
      ));
      
      // Update selectedFile regardless of current state, if it matches the file we are processing
      // OR if we just uploaded it (which might be why it's null or not matching yet in closure)
      setSelectedFile(prev => {
        if (prev?.id === file.id || file.id) { 
           // If we are processing 'file', we should show its new status
           return { ...file, status, summary, keywords };
        }
        return prev;
      });
    };

    updateStatus('processing');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileUrl: file.url, 
          fileType: file.type,
          language: aiSettings.language,
          customPrompt: aiSettings.customPrompt
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      // Update Database
      // Note: We need to ensure the 'keywords' column exists in Supabase or store it in a JSONB column
      // For now, we will store it in the 'summary' column or create a new column if possible,
      // but since we cannot modify the DB schema directly here, we will assume the UI state update is enough for the session
      // or we just update the summary text. Ideally, we should have a 'keywords' column.
      // However, to persist it without DB changes, we might append it to summary or just use UI state.
      // Let's assume we only update UI for now or if we can update DB, we would do:
      // .update({ summary: data.summary, keywords: data.keywords, status: 'ready' })
      
      const { error: dbError } = await supabase
        .from('documents')
        .update({ summary: data.summary, status: 'ready' })
        .eq('id', file.id);

      if (dbError) throw dbError;

      updateStatus('ready', data.summary, data.keywords);
      
    } catch (error: unknown) {
      console.error('Summary generation failed:', error);
      updateStatus('error', 'Failed to generate summary. Please try again.');
      alert('Summary generation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteFile = async (file: DocumentFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    try {
      // 1. Delete from Database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', file.id);

      if (dbError) throw new Error(`Database Delete Error: ${dbError.message}`);

      // 2. Delete from Storage
      // Extract filename from URL (e.g., .../documents/0.123.pdf -> 0.123.pdf)
      const fileName = file.url.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([fileName]);
        
        if (storageError) console.error('Storage Delete Error:', storageError);
      }

      // 3. Update UI
      setFiles(prev => prev.filter(f => f.id !== file.id));
      if (selectedFile?.id === file.id) {
        setSelectedFile(null);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Delete failed:', errorMessage);
      alert('Delete failed: ' + errorMessage);
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
        onDelete={handleDeleteFile}
        uploading={uploading}
      />
      <MainContent 
        selectedFile={selectedFile}
        onGenerateSummary={handleGenerateSummary}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={aiSettings}
        onSave={setAiSettings}
      />
    </div>
  );
}
