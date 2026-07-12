/**
 * Settings IPC: read/write settings (with a key allowlist), list available
 * embedding and Ollama models, and return system info.
 */
import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import { getAllSettings, updateSetting } from '../database/settings';
import { listOllamaModels } from '../engine/ollama';
import { getSystemInfo } from '../setup/system-check';
import { getAvailableEmbeddingModels } from '../engine/embedder';

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS.GET, async () => getAllSettings());

  ipcMain.handle(IPC.SETTINGS.UPDATE, async (_event, key: string, value: string) => {
    if (!key || typeof key !== 'string') throw new Error('Invalid setting key');
    const allowed = ['ollama_url', 'ollama_model', 'embedding_model', 'llm_temperature', 'llm_context_size', 'retrieval_top_k', 'chunk_size', 'chunk_overlap', 'system_prompt', 'google_api_key', 'google_search_engine_id'];
    if (!allowed.includes(key)) throw new Error(`Unknown setting: ${key}`);
    updateSetting(key, String(value));
    return { success: true };
  });

  ipcMain.handle(IPC.SETTINGS.GET_AVAILABLE_MODELS, async () => {
    return { embedding: getAvailableEmbeddingModels() };
  });

  ipcMain.handle(IPC.SETTINGS.LIST_OLLAMA_MODELS, async () => {
    return listOllamaModels();
  });

  ipcMain.handle(IPC.SETTINGS.SYSTEM_INFO, async () => getSystemInfo());
}
