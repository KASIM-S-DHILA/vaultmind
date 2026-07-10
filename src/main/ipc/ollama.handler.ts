import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import {
  checkOllamaInstalled,
  checkOllamaRunning,
  pullModel,
  warmupModel,
} from '../engine/ollama';

export function registerOllamaHandlers(): void {
  ipcMain.handle(IPC.OLLAMA.CHECK_INSTALLED, async () => {
    return checkOllamaInstalled();
  });

  ipcMain.handle(IPC.OLLAMA.CHECK_RUNNING, async () => {
    return checkOllamaRunning();
  });

  ipcMain.handle(IPC.OLLAMA.PULL_MODEL, async (event, modelName: string) => {
    return pullModel(modelName, (progress) => {
      event.sender.send(IPC.OLLAMA.PULL_PROGRESS, progress);
    });
  });

  ipcMain.handle(IPC.OLLAMA.WARMUP, async (_event, modelName: string) => {
    await warmupModel(modelName);
  });
}
