import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('vaultmindSplash', {
  onStatus: (cb: (data: unknown) => void) => {
    ipcRenderer.on('server:status', (_event: Electron.IpcRendererEvent, data: unknown) => cb(data));
    return () => ipcRenderer.removeAllListeners('server:status');
  },
});
