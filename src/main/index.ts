import { app, BrowserWindow, ipcMain } from 'electron';
import { createSplashWindow } from './splash';
import { registerAllHandlers } from './ipc';
import { initDatabase } from './database/sqlite';
import { initVectorStore } from './engine/vector-store';
import { createMainWindow, createTray } from './window-manager';
import { isSetupComplete } from './setup/system-check';
import { startOllamaServer, waitForOllamaReady, setCurrentStatus } from './engine/ollama';
import { OLLAMA_STARTUP_TIMEOUT, OLLAMA_EXTENDED_TIMEOUT } from '../shared/constants';
import { logger } from '../shared/logger';

const isDev = process.env.NODE_ENV === 'development';

if (!isDev) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    process.exit(0);
  }
}

app.disableHardwareAcceleration();

app.commandLine.appendSwitch('enable-logging');
app.commandLine.appendSwitch('v', '1');

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

function broadcastStatus(stage: string, progress: number, message: string): void {
  const data = { stage, progress, message };
  if (splashWindow && !splashWindow.isDestroyed()) {
    try { splashWindow.webContents.send('server:status', data); } catch { /* ignore */ }
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.webContents.send('server:status', data); } catch { /* ignore */ }
  }
}

app.whenReady().then(async () => {
  splashWindow = createSplashWindow();

  try {
    broadcastStatus('db', 10, 'Initializing database...');
    await initDatabase();
  } catch (err) {
    logger.error('Startup', 'Database init failed:', (err as Error).message);
    broadcastStatus('error', 0, 'Database error: ' + (err as Error).message);
  }

  try {
    broadcastStatus('vectors', 30, 'Preparing vector store...');
    await initVectorStore();
  } catch (err) {
    logger.warn('Startup', 'Vector store init failed, RAG will be unavailable:', (err as Error).message);
    broadcastStatus('vectors', 30, 'Vector store unavailable');
  }

  broadcastStatus('handlers', 40, 'Registering services...');
  registerAllHandlers();

  broadcastStatus('ollama', 50, 'Starting Ollama AI server...');
  startOllamaServer().catch(err => logger.warn('Main', 'Ollama start warning:', err.message));

  // Don't block UI — create main window immediately, poll ollama in background
  mainWindow = createMainWindow(splashWindow);
  (async () => {
    const quickReady = await waitForOllamaReady(OLLAMA_STARTUP_TIMEOUT);
    if (quickReady) {
      setCurrentStatus('ready', 100, 'Ollama AI ready!');
      broadcastStatus('ready', 100, 'Ollama AI ready!');
      return;
    }
    // Extended polling — keep trying for up to OLLAMA_EXTENDED_TIMEOUT total
    const extendedStart = Date.now();
    while (Date.now() - extendedStart < OLLAMA_EXTENDED_TIMEOUT) {
      const stillReady = await waitForOllamaReady(15000);
      if (stillReady) {
        setCurrentStatus('ready', 100, 'Ollama AI ready!');
        broadcastStatus('ready', 100, 'Ollama AI ready!');
        return;
      }
      setCurrentStatus('starting', 80, 'Still starting Ollama...');
      broadcastStatus('starting', 80, 'Still starting Ollama...');
    }
    setCurrentStatus('error', 0, 'Ollama failed to start — check installation');
    broadcastStatus('error', 0, 'Ollama failed to start — check installation');
  })();
  createTray(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow(null);
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
