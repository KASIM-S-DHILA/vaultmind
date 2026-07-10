import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, OLLAMA_PRESETS, EMBEDDING_MODELS, IPC } from '../shared/constants';

describe('shared constants', () => {
  it('DEFAULT_SETTINGS has required keys', () => {
    expect(DEFAULT_SETTINGS.OLLAMA_URL).toBe('http://127.0.0.1:11434');
    expect(DEFAULT_SETTINGS.OLLAMA_MODEL).toBe('gemma3:4b');
    expect(DEFAULT_SETTINGS.EMBEDDING_MODEL).toBe('nomic-embed-text-v1.5');
  });

  it('OLLAMA_PRESETS has 6 models', () => {
    expect(OLLAMA_PRESETS).toHaveLength(6);
    expect(OLLAMA_PRESETS[0].name).toBe('gemma3:4b');
  });

  it('EMBEDDING_MODELS has correct dimensions', () => {
    expect(EMBEDDING_MODELS['all-MiniLM-L6-v2'].dimensions).toBe(384);
    expect(EMBEDDING_MODELS['nomic-embed-text-v1.5'].dimensions).toBe(768);
  });

  it('IPC channels are well-formed', () => {
    expect(IPC.NOTEBOOKS.LIST).toBe('notebooks:list');
    expect(IPC.CHAT.SEND).toBe('chat:send');
    expect(IPC.SOURCES.UPLOAD).toBe('sources:upload');
    expect(IPC.WINDOW.MINIMIZE).toBe('window:minimize');
  });
});
