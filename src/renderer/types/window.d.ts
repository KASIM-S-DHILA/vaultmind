import type { Notebook, Source, Message, Citation, NotebookGuide, UploadProgress } from '../../shared/types';

interface VaultMindAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => boolean;
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
    send: (notebookId: string, message: string, onToken: (token: string) => void, activeSourceIds?: string[]) => Promise<{ id: string; content: string; citations: Citation[] }>;
    getHistory: (notebookId: string) => Promise<Message[]>;
    clearHistory: (notebookId: string) => Promise<{ success: boolean }>;
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
    warmupModel: (modelName: string) => Promise<void>;
    downloadAndInstall: (onProgress: (data: { percent: number; status: string; message: string }) => void) => Promise<void>;
    startServer: () => Promise<void>;
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
