import { vi } from 'vitest';
import '@testing-library/jest-dom';

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock window.vaultmind API — keep in sync with actual preload bindings
Object.defineProperty(window, 'vaultmind', {
  value: {
    window: {
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
      isMaximized: vi.fn().mockReturnValue(false),
      onMaximizeChange: vi.fn().mockReturnValue(vi.fn()),
    },
    notebooks: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      rename: vi.fn(),
      delete: vi.fn(),
      getGuide: vi.fn().mockResolvedValue({ overview: '', keyThemes: [], suggestedQuestions: [] }),
    },
    sources: {
      list: vi.fn().mockResolvedValue([]),
      upload: vi.fn(),
      delete: vi.fn(),
      getContent: vi.fn(),
      setActive: vi.fn(),
      onProgress: vi.fn().mockReturnValue(vi.fn()),
    },
    chat: {
      send: vi.fn().mockResolvedValue({ id: 'msg1', content: 'response', citations: [] }),
      getHistory: vi.fn().mockResolvedValue([]),
      clearHistory: vi.fn(),
      stop: vi.fn(),
      export: vi.fn().mockResolvedValue({ success: true, filePath: '/tmp/chat.md' }),
    },
    sessions: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'sess1', notebook_id: 'nb1', title: 'New Chat', created_at: Date.now(), updated_at: Date.now() }),
      rename: vi.fn(),
      delete: vi.fn(),
    },
    notes: {
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
    },
    settings: {
      get: vi.fn().mockResolvedValue({}),
      update: vi.fn(),
      getAvailableModels: vi.fn(),
      downloadModel: vi.fn(),
      setActiveModel: vi.fn(),
      deleteModel: vi.fn(),
      listOllamaModels: vi.fn().mockResolvedValue([]),
      getSystemInfo: vi.fn(),
    },
    ollama: {
      checkInstalled: vi.fn(),
      checkRunning: vi.fn().mockResolvedValue(true),
      pullModel: vi.fn(),
      getStatus: vi.fn().mockResolvedValue({ stage: 'ready' }),
      warmupModel: vi.fn(),
    },
    onServerStatus: vi.fn().mockReturnValue(vi.fn()),
    setup: {
      isComplete: vi.fn().mockResolvedValue(true),
      downloadModel: vi.fn(),
      complete: vi.fn(),
      getSystemInfo: vi.fn(),
    },
    openExternal: vi.fn(),
    selectFiles: vi.fn(),
  },
  writable: true,
  configurable: true,
});
