import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
  OLLAMA_PRESETS,
  EMBEDDING_MODELS,
  SUPPORTED_FILE_EXTENSIONS,
  CHUNK_DEFAULTS,
  OLLAMA_POLL_INTERVAL,
  OLLAMA_STARTUP_TIMEOUT,
  OLLAMA_EXTENDED_TIMEOUT,
  WINDOW_DEFAULTS,
  IPC,
} from '../shared/constants';

describe('shared constants', () => {
  it('DEFAULT_SETTINGS has required keys', () => {
    expect(DEFAULT_SETTINGS.OLLAMA_URL).toBe('http://127.0.0.1:11434');
    expect(DEFAULT_SETTINGS.OLLAMA_MODEL).toBe('gemma3:4b');
    expect(DEFAULT_SETTINGS.EMBEDDING_MODEL).toBe('nomic-embed-text-v1.5');
    expect(DEFAULT_SETTINGS.LLM_TEMPERATURE).toBe('0.3');
    expect(DEFAULT_SETTINGS.RETRIEVAL_TOP_K).toBe('5');
    expect(DEFAULT_SETTINGS.CHUNK_SIZE).toBe('500');
    expect(DEFAULT_SETTINGS.CHUNK_OVERLAP).toBe('50');
  });

  it('DEFAULT_SETTINGS.SYSTEM_PROMPT contains {context} placeholder', () => {
    expect(DEFAULT_SETTINGS.SYSTEM_PROMPT).toContain('{context}');
  });

  it('OLLAMA_PRESETS has 6 models', () => {
    expect(OLLAMA_PRESETS).toHaveLength(6);
    expect(OLLAMA_PRESETS[0].name).toBe('gemma3:4b');
    expect(OLLAMA_PRESETS[5].name).toBe('llama3.2:latest');
  });

  it('each OLLAMA_PRESETS entry has required fields', () => {
    for (const preset of OLLAMA_PRESETS) {
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('display');
      expect(preset).toHaveProperty('desc');
      expect(typeof preset.name).toBe('string');
      expect(typeof preset.display).toBe('string');
    }
  });

  it('EMBEDDING_MODELS has correct dimensions', () => {
    expect(EMBEDDING_MODELS['all-MiniLM-L6-v2'].dimensions).toBe(384);
    expect(EMBEDDING_MODELS['nomic-embed-text-v1.5'].dimensions).toBe(768);
    expect(EMBEDDING_MODELS['bge-small-en-v1.5'].dimensions).toBe(384);
  });

  it('each EMBEDDING_MODELS entry has required fields', () => {
    for (const [key, val] of Object.entries(EMBEDDING_MODELS)) {
      expect(val).toHaveProperty('dimensions');
      expect(val).toHaveProperty('size');
      expect(val).toHaveProperty('description');
      expect(typeof key).toBe('string');
    }
  });

  it('SUPPORTED_FILE_EXTENSIONS', () => {
    expect(SUPPORTED_FILE_EXTENSIONS).toEqual(['pdf', 'txt', 'md', 'csv']);
  });

  it('CHUNK_DEFAULTS', () => {
    expect(CHUNK_DEFAULTS.SIZE).toBe(500);
    expect(CHUNK_DEFAULTS.OVERLAP).toBe(50);
    expect(CHUNK_DEFAULTS.BATCH_SIZE_EMBED).toBe(32);
  });

  it('Ollama polling constants', () => {
    expect(OLLAMA_POLL_INTERVAL).toBe(500);
    expect(OLLAMA_STARTUP_TIMEOUT).toBe(30000);
    expect(OLLAMA_EXTENDED_TIMEOUT).toBe(120000);
  });

  it('WINDOW_DEFAULTS', () => {
    expect(WINDOW_DEFAULTS.WIDTH).toBe(1400);
    expect(WINDOW_DEFAULTS.HEIGHT).toBe(900);
    expect(WINDOW_DEFAULTS.MIN_WIDTH).toBe(900);
    expect(WINDOW_DEFAULTS.MIN_HEIGHT).toBe(600);
  });

  it('IPC channels are well-formed strings', () => {
    const channels = [
      IPC.NOTEBOOKS.LIST, IPC.NOTEBOOKS.CREATE, IPC.NOTEBOOKS.RENAME, IPC.NOTEBOOKS.DELETE,
      IPC.CHAT.SEND, IPC.CHAT.STOP, IPC.CHAT.HISTORY, IPC.CHAT.CLEAR, IPC.CHAT.EXPORT, IPC.CHAT.TOKEN,
      IPC.SOURCES.LIST, IPC.SOURCES.UPLOAD, IPC.SOURCES.DELETE, IPC.SOURCES.PROGRESS,
      IPC.SOURCES.GET_CONTENT, IPC.SOURCES.SET_ACTIVE,
      IPC.DIALOG.SELECT_FILES,
      IPC.SESSIONS.LIST, IPC.SESSIONS.CREATE, IPC.SESSIONS.RENAME, IPC.SESSIONS.DELETE,
      IPC.SETTINGS.GET, IPC.SETTINGS.UPDATE, IPC.SETTINGS.GET_AVAILABLE_MODELS, IPC.SETTINGS.LIST_OLLAMA_MODELS, IPC.SETTINGS.SYSTEM_INFO,
      IPC.NOTES.GET, IPC.NOTES.SAVE,
      IPC.OLLAMA.CHECK_INSTALLED, IPC.OLLAMA.CHECK_RUNNING, IPC.OLLAMA.GET_STATUS,
      IPC.OLLAMA.PULL_MODEL, IPC.OLLAMA.PULL_PROGRESS, IPC.OLLAMA.WARMUP, IPC.OLLAMA.WARMUP_PROGRESS,
      IPC.OLLAMA.DOWNLOAD_INSTALL, IPC.OLLAMA.DOWNLOAD_PROGRESS, IPC.OLLAMA.START_SERVER,
      IPC.OLLAMA.SET_AUTO_START, IPC.OLLAMA.GET_AUTO_START,
      IPC.SETUP.IS_COMPLETE, IPC.SETUP.SYSTEM_INFO, IPC.SETUP.COMPLETE,
      IPC.WINDOW.MINIMIZE, IPC.WINDOW.MAXIMIZE, IPC.WINDOW.CLOSE, IPC.WINDOW.IS_MAXIMIZED, IPC.WINDOW.MAXIMIZED, IPC.WINDOW.DEVTOOLS,
      IPC.EXTERNAL.OPEN,
    ];
    for (const ch of channels) {
      expect(typeof ch).toBe('string');
      expect(ch.length).toBeGreaterThan(0);
    }
  });

  it('IPC channels follow domain:action convention', () => {
    expect(IPC.NOTEBOOKS.LIST).toMatch(/^[a-z]+:[a-z]+/);
    expect(IPC.CHAT.SEND).toMatch(/^[a-z]+:[a-z]+/);
    expect(IPC.SOURCES.UPLOAD).toMatch(/^[a-z]+:[a-z]+/);
  });
});
