export interface Notebook {
  id: string;
  title: string;
  guide_json: string | null;
  created_at: number;
  updated_at: number;
}

export interface Source {
  id: string;
  notebook_id: string;
  filename: string;
  file_type: string;
  file_path: string;
  file_size: number | null;
  status: SourceStatus;
  summary: string | null;
  chunk_count: number | null;
  error_message: string | null;
  active: number;
  created_at: number;
  updated_at: number;
}

export type SourceStatus = 'processing' | 'ready' | 'error';

export interface Message {
  id: string;
  notebook_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations_json: string | null;
  citations?: Citation[];
  created_at: number;
}

export interface Citation {
  label: number;
  sourceId: string;
  sourceTitle: string;
  chunkText: string;
  page: number;
}

export interface Note {
  id: string;
  notebook_id: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface NotebookGuide {
  overview: string;
  keyThemes: string[];
  suggestedQuestions: string[];
}

export interface UploadProgress {
  sourceId: string;
  status: SourceStatus;
  progress?: number;
  error?: string;
}
