export interface DocumentFile {
  id: string;
  name: string;
  type: 'pdf' | 'video';
  url: string; // URL for preview
  uploadDate: string;
  summary?: string; // AI summary content
  status: 'processing' | 'ready' | 'error';
}
