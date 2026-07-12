import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/constants';

contextBridge.exposeInMainWorld('vaultmind', {
  window: {
    minimize: () => ipcRenderer.send(IPC.WINDOW.MINIMIZE),
    maximize: () => ipcRenderer.send(IPC.WINDOW.MAXIMIZE),
    close: () => ipcRenderer.send(IPC.WINDOW.CLOSE),
    isMaximized: () => ipcRenderer.sendSync(IPC.WINDOW.IS_MAXIMIZED),
    onMaximizeChange: (cb: (val: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, val: boolean) => cb(val);
      ipcRenderer.on(IPC.WINDOW.MAXIMIZED, listener);
      return () => ipcRenderer.removeListener(IPC.WINDOW.MAXIMIZED, listener);
    },
  },

  notebooks: {
    list: () => ipcRenderer.invoke(IPC.NOTEBOOKS.LIST),
    create: (title: string) => ipcRenderer.invoke(IPC.NOTEBOOKS.CREATE, title),
    rename: (id: string, title: string) => ipcRenderer.invoke(IPC.NOTEBOOKS.RENAME, id, title),
    delete: (id: string) => ipcRenderer.invoke(IPC.NOTEBOOKS.DELETE, id),
    getGuide: (id: string, sourceIds?: string[]) => ipcRenderer.invoke(IPC.NOTEBOOKS.GET_GUIDE, id, sourceIds),
  },

  sources: {
    list: (notebookId: string) => ipcRenderer.invoke(IPC.SOURCES.LIST, notebookId),
    upload: (notebookId: string, filePaths: string[]) => ipcRenderer.invoke(IPC.SOURCES.UPLOAD, notebookId, filePaths),
    delete: (sourceId: string) => ipcRenderer.invoke(IPC.SOURCES.DELETE, sourceId),
    getContent: (sourceId: string) => ipcRenderer.invoke(IPC.SOURCES.GET_CONTENT, sourceId),
    setActive: (sourceId: string, active: boolean) => ipcRenderer.invoke(IPC.SOURCES.SET_ACTIVE, sourceId, active),
    onProgress: (cb: (data: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: unknown) => cb(data);
      ipcRenderer.on(IPC.SOURCES.PROGRESS, listener);
      return () => ipcRenderer.removeListener(IPC.SOURCES.PROGRESS, listener);
    },
  },

  chat: {
    send: (notebookId: string, message: string, onToken: (token: string) => void, activeSourceIds?: string[], webSearch?: boolean, sessionId?: string) => {
      const listener = (_event: Electron.IpcRendererEvent, token: string) => onToken(token);
      ipcRenderer.on(IPC.CHAT.TOKEN, listener);
      return ipcRenderer.invoke(IPC.CHAT.SEND, notebookId, message, activeSourceIds, webSearch, sessionId).finally(() => {
        ipcRenderer.removeListener(IPC.CHAT.TOKEN, listener);
      });
    },
    stop: (notebookId: string) => ipcRenderer.invoke(IPC.CHAT.STOP, notebookId),
    getHistory: (notebookId: string, sessionId?: string) => ipcRenderer.invoke(IPC.CHAT.HISTORY, notebookId, sessionId),
    clearHistory: (notebookId: string, sessionId?: string) => ipcRenderer.invoke(IPC.CHAT.CLEAR, notebookId, sessionId),
    export: (notebookId: string, sessionId?: string) => ipcRenderer.invoke(IPC.CHAT.EXPORT, notebookId, sessionId),
  },

  sessions: {
    list: (notebookId: string) => ipcRenderer.invoke(IPC.SESSIONS.LIST, notebookId),
    create: (notebookId: string, title?: string) => ipcRenderer.invoke(IPC.SESSIONS.CREATE, notebookId, title),
    rename: (id: string, title: string) => ipcRenderer.invoke(IPC.SESSIONS.RENAME, id, title),
    delete: (id: string) => ipcRenderer.invoke(IPC.SESSIONS.DELETE, id),
  },

  notes: {
    get: (notebookId: string) => ipcRenderer.invoke(IPC.NOTES.GET, notebookId),
    save: (notebookId: string, content: string) => ipcRenderer.invoke(IPC.NOTES.SAVE, notebookId, content),
  },

  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS.GET),
    update: (key: string, value: string) => ipcRenderer.invoke(IPC.SETTINGS.UPDATE, key, value),
    getAvailableModels: () => ipcRenderer.invoke(IPC.SETTINGS.GET_AVAILABLE_MODELS),
    listOllamaModels: () => ipcRenderer.invoke(IPC.SETTINGS.LIST_OLLAMA_MODELS),
    getSystemInfo: () => ipcRenderer.invoke(IPC.SETTINGS.SYSTEM_INFO),
  },

  ollama: {
    checkInstalled: () => ipcRenderer.invoke(IPC.OLLAMA.CHECK_INSTALLED),
    checkRunning: () => ipcRenderer.invoke(IPC.OLLAMA.CHECK_RUNNING),
    pullModel: (modelName: string, onProgress: (data: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: unknown) => onProgress(data);
      ipcRenderer.on(IPC.OLLAMA.PULL_PROGRESS, listener);
      return ipcRenderer.invoke(IPC.OLLAMA.PULL_MODEL, modelName).finally(() => {
        ipcRenderer.removeListener(IPC.OLLAMA.PULL_PROGRESS, listener);
      });
    },
    warmupModel: (modelName: string, onProgress?: (data: { percent: number; status: string; message: string }) => void) => {
      const listener = onProgress ? (_event: Electron.IpcRendererEvent, data: { percent: number; status: string; message: string }) => onProgress(data) : null;
      if (listener) ipcRenderer.on(IPC.OLLAMA.WARMUP_PROGRESS, listener);
      return ipcRenderer.invoke(IPC.OLLAMA.WARMUP, modelName).finally(() => {
        if (listener) ipcRenderer.removeListener(IPC.OLLAMA.WARMUP_PROGRESS, listener);
      });
    },
    downloadAndInstall: (onProgress: (data: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: unknown) => onProgress(data);
      ipcRenderer.on(IPC.OLLAMA.DOWNLOAD_PROGRESS, listener);
      return ipcRenderer.invoke(IPC.OLLAMA.DOWNLOAD_INSTALL).finally(() => {
        ipcRenderer.removeListener(IPC.OLLAMA.DOWNLOAD_PROGRESS, listener);
      });
    },
    startServer: () => ipcRenderer.invoke(IPC.OLLAMA.START_SERVER),
    setAutoStart: (enabled: boolean) => ipcRenderer.invoke(IPC.OLLAMA.SET_AUTO_START, enabled),
    getAutoStart: () => ipcRenderer.invoke(IPC.OLLAMA.GET_AUTO_START),
  },

  onServerStatus: (cb: (data: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => cb(data);
    ipcRenderer.on(IPC.SERVER.STATUS, listener);
    return () => ipcRenderer.removeListener(IPC.SERVER.STATUS, listener);
  },

  setup: {
    isComplete: () => ipcRenderer.invoke(IPC.SETUP.IS_COMPLETE),
    complete: () => ipcRenderer.invoke(IPC.SETUP.COMPLETE),
    getSystemInfo: () => ipcRenderer.invoke(IPC.SETUP.SYSTEM_INFO),
  },

  openExternal: (url: string) => ipcRenderer.send(IPC.EXTERNAL.OPEN, url),
  selectFiles: (options?: unknown) => ipcRenderer.invoke(IPC.DIALOG.SELECT_FILES, options),
});
