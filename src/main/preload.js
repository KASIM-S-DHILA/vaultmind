const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, typed API to the renderer process
contextBridge.exposeInMainWorld('vaultmind', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.sendSync('window:isMaximized'),
    onMaximizeChange: (cb) => {
      ipcRenderer.on('window:maximized', (_, val) => cb(val));
      return () => ipcRenderer.removeAllListeners('window:maximized');
    },
  },

  // Notebooks
  notebooks: {
    list: () => ipcRenderer.invoke('notebooks:list'),
    create: (title) => ipcRenderer.invoke('notebooks:create', title),
    rename: (id, title) => ipcRenderer.invoke('notebooks:rename', id, title),
    delete: (id) => ipcRenderer.invoke('notebooks:delete', id),
    getGuide: (id) => ipcRenderer.invoke('notebooks:getGuide', id),
  },

  // Sources
  sources: {
    list: (notebookId) => ipcRenderer.invoke('sources:list', notebookId),
    upload: (notebookId, filePaths) => ipcRenderer.invoke('sources:upload', notebookId, filePaths),
    delete: (sourceId) => ipcRenderer.invoke('sources:delete', sourceId),
    getContent: (sourceId) => ipcRenderer.invoke('sources:getContent', sourceId),
    onProgress: (cb) => {
      ipcRenderer.on('sources:progress', (_, data) => cb(data));
      return () => ipcRenderer.removeAllListeners('sources:progress');
    },
  },

  // Chat
  chat: {
    send: (notebookId, message, onToken) => {
      // Set up token streaming listener
      const listener = (_, token) => onToken(token);
      ipcRenderer.on('chat:token', listener);

      return ipcRenderer.invoke('chat:send', notebookId, message).finally(() => {
        ipcRenderer.removeListener('chat:token', listener);
      });
    },
    getHistory: (notebookId) => ipcRenderer.invoke('chat:history', notebookId),
    clearHistory: (notebookId) => ipcRenderer.invoke('chat:clear', notebookId),
  },

  // Notes
  notes: {
    get: (notebookId) => ipcRenderer.invoke('notes:get', notebookId),
    save: (notebookId, content) => ipcRenderer.invoke('notes:save', notebookId, content),
  },

  // Settings (includes model management)
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (key, value) => ipcRenderer.invoke('settings:update', key, value),
    getAvailableModels: () => ipcRenderer.invoke('settings:getAvailableModels'),
    downloadModel: (url, type, onProgress) => {
      const listener = (_, data) => onProgress(data);
      ipcRenderer.on('model:downloadProgress', listener);
      return ipcRenderer.invoke('settings:downloadModel', url, type).finally(() => {
        ipcRenderer.removeListener('model:downloadProgress', listener);
      });
    },
    setActiveModel: (type, modelName) => ipcRenderer.invoke('settings:setActiveModel', type, modelName),
    deleteModel: (type, modelName) => ipcRenderer.invoke('settings:deleteModel', type, modelName),
    listOllamaModels: () => ipcRenderer.invoke('settings:listOllamaModels'),
    getSystemInfo: () => ipcRenderer.invoke('settings:systemInfo'),
  },

  // Setup wizard
  setup: {
    isComplete: () => ipcRenderer.invoke('setup:isComplete'),
    downloadModel: (type, onProgress) => {
      const listener = (_, data) => onProgress(data);
      ipcRenderer.on('model:downloadProgress', listener);
      return ipcRenderer.invoke('setup:downloadModel', type).finally(() => {
        ipcRenderer.removeListener('model:downloadProgress', listener);
      });
    },
    complete: () => ipcRenderer.invoke('setup:complete'),
    getSystemInfo: () => ipcRenderer.invoke('setup:systemInfo'),
  },

  // Shell
  openExternal: (url) => ipcRenderer.send('open-external', url),
  selectFiles: (options) => ipcRenderer.invoke('dialog:selectFiles', options),
});
