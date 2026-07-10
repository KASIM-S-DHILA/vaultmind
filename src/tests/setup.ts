import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock window.vaultmind API
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
      send: vi.fn(),
      getHistory: vi.fn().mockResolvedValue([]),
      clearHistory: vi.fn(),
    },
    notes: {
      get: vi.fn(),
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
      checkRunning: vi.fn(),
      pullModel: vi.fn(),
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
