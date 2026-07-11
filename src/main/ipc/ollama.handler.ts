import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import {
  checkOllamaInstalled,
  checkOllamaRunning,
  pullModel,
  warmupModel,
  downloadAndInstallOllama,
  startOllamaServer,
  setOllamaAutoStart,
  getOllamaAutoStart,
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

  ipcMain.handle(IPC.OLLAMA.WARMUP, async (event, modelName: string) => {
    await warmupModel(modelName, (progress) => {
      event.sender.send(IPC.OLLAMA.WARMUP_PROGRESS, progress);
    });
  });

  ipcMain.handle(IPC.OLLAMA.DOWNLOAD_INSTALL, async (event) => {
    await downloadAndInstallOllama((progress) => {
      event.sender.send(IPC.OLLAMA.DOWNLOAD_PROGRESS, progress);
    });
  });

  ipcMain.handle(IPC.OLLAMA.START_SERVER, async () => {
    await startOllamaServer();
  });

  ipcMain.handle(IPC.OLLAMA.SET_AUTO_START, async (_event, enabled: boolean) => {
    return { success: setOllamaAutoStart(enabled) };
  });

  ipcMain.handle(IPC.OLLAMA.GET_AUTO_START, async () => {
    return getOllamaAutoStart();
  });
}
