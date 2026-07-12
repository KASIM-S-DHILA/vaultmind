import type { Notebook, Source, Message, Citation, NotebookGuide, UploadProgress } from '../../shared/types';

interface VaultMindAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => boolean;
    openDevTools: () => void;
    onMaximizeChange: (cb: (val: boolean) => void) => () => void;
  };
  notebooks: {
    list: () => Promise<Notebook[]>;
    create: (title: string) => Promise<Notebook>;
    rename: (id: string, title: string) => Promise<Notebook>;
    delete: (id: string) => Promise<{ success: boolean }>;
    getGuide: (id: string, sourceIds?: string[]) => Promise<NotebookGuide>;
  };
  sources: {
    list: (notebookId: string) => Promise<Source[]>;
    upload: (notebookId: string, filePaths: string[]) => Promise<Array<{ id: string; filename: string; fileType: string; status: string }>>;
    delete: (sourceId: string) => Promise<{ success: boolean }>;
    getContent: (sourceId: string) => Promise<{ filename: string; file_type: string; summary: string | null } | undefined>;
    setActive: (sourceId: string, active: boolean) => Promise<{ success: boolean }>;
    onProgress: (cb: (data: UploadProgress) => void) => () => void;
  };
  chat: {
    send: (notebookId: string, message: string, onToken: (token: string) => void, activeSourceIds?: string[], webSearch?: boolean, sessionId?: string) => Promise<{ id: string; content: string; citations: Citation[] }>;
    stop: (notebookId: string) => Promise<{ success: boolean }>;
    getHistory: (notebookId: string, sessionId?: string) => Promise<Message[]>;
    clearHistory: (notebookId: string, sessionId?: string) => Promise<{ success: boolean }>;
    export: (notebookId: string, sessionId?: string) => Promise<{ success: boolean; filePath?: string }>;
  };
  sessions: {
    list: (notebookId: string) => Promise<Array<{ id: string; notebook_id: string; title: string; created_at: number; updated_at: number }>>;
    create: (notebookId: string, title?: string) => Promise<{ id: string; notebook_id: string; title: string; created_at: number; updated_at: number }>;
    rename: (id: string, title: string) => Promise<{ success: boolean }>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  notes: {
    get: (notebookId: string) => Promise<{ content: string } | undefined>;
    save: (notebookId: string, content: string) => Promise<{ success: boolean }>;
  };
  settings: {
    get: () => Promise<Record<string, string>>;
    update: (key: string, value: string) => Promise<{ success: boolean }>;
    getAvailableModels: () => Promise<Record<string, unknown>>;
    listOllamaModels: () => Promise<unknown[]>;
    getSystemInfo: () => Promise<unknown>;
  };
  ollama: {
    checkInstalled: () => Promise<{ installed: boolean; version: string | null }>;
    checkRunning: () => Promise<boolean>;
    pullModel: (modelName: string, onProgress: (data: unknown) => void) => Promise<{ success: boolean; model: string }>;
    warmupModel: (modelName: string, onProgress?: (data: { percent: number; status: string; message: string }) => void) => Promise<void>;
    downloadAndInstall: (onProgress: (data: { percent: number; status: string; message: string }) => void) => Promise<void>;
    startServer: () => Promise<void>;
    getStatus: () => Promise<{ stage: string; progress: number; message: string }>;
    setAutoStart: (enabled: boolean) => Promise<{ success: boolean }>;
    getAutoStart: () => Promise<boolean>;
  };
  onServerStatus: (cb: (data: { stage: string; progress: number; message: string }) => void) => () => void;
  setup: {
    isComplete: () => Promise<boolean>;
    complete: () => Promise<{ success: boolean }>;
    getSystemInfo: () => Promise<unknown>;
  };
  openExternal: (url: string) => void;
  selectFiles: (options?: unknown) => Promise<string[]>;
}

declare global {
  interface Window {
    vaultmind: VaultMindAPI;
  }
}
