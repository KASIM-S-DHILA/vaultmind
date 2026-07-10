import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import { getAllSettings, updateSetting } from '../database/settings';
import { listOllamaModels } from '../engine/ollama';
import { getSystemInfo } from '../setup/system-check';
import { getAvailableEmbeddingModels } from '../engine/embedder';

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS.GET, async () => getAllSettings());

  ipcMain.handle(IPC.SETTINGS.UPDATE, async (_event, key: string, value: string) => {
    updateSetting(key, value);
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
