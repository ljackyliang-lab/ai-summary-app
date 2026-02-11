export interface DocumentFile {
  id: string;
  name: string;
  type: 'pdf';
  url: string; // URL for preview
  uploadDate: string;
  summary?: string; // AI summary content
  keywords?: string[]; // Extracted keywords
  status: 'processing' | 'ready' | 'error';
}

export interface AISettings {
  language: string;
  customPrompt: string;
}
