const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { createSplashWindow } = require('./splash');
const { registerAllHandlers } = require('./ipc-handlers');
const { initDatabase } = require('./database/sqlite');
const { initVectorStore } = require('./engine/vector-store');
const { checkFirstRun } = require('./setup/system-check');

const isDev = process.env.NODE_ENV === 'development';

// Single-instance lock (only in production to allow easy dev restarts)
if (!isDev) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    process.exit(0);
  }
}

// Disable hardware acceleration — prevents blank window on some Windows/GPU configs
app.disableHardwareAcceleration();

// Enable verbose Electron logging
app.commandLine.appendSwitch('enable-logging');
app.commandLine.appendSwitch('v', '1');

let mainWindow = null;
let splashWindow = null;
let tray = null;

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    x: 100,
    y: 100,
    show: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0b0f',
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Listen for renderer crash/hang to diagnose blank window
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Main] Renderer process gone! Reason:', details.reason, 'ExitCode:', details.exitCode);
  });
  mainWindow.webContents.on('unresponsive', () => {
    console.error('[Main] Renderer became unresponsive!');
  });
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Page failed to load:', errorCode, errorDescription);
  });
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
    if (level >= 2) console.log(`[Renderer ${levels[level]}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.once('ready-to-show', () => {
    console.log('[Main] MainWindow ready-to-show event fired');
    if (splashWindow && !splashWindow.isDestroyed()) {
      console.log('[Main] Closing splash window');
      splashWindow.close();
      splashWindow = null;
    }
    console.log('[Main] Showing main window');
    mainWindow.show();
    mainWindow.focus();
  });

  // Load renderer
  console.log('[Main] Loading renderer URL/File...');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' }); // disabled - open manually with Ctrl+Shift+I if needed
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }
  console.log('[Main] Renderer load triggered');

  mainWindow.on('closed', () => {
    console.log('[Main] MainWindow closed event');
    mainWindow = null;
  });

  // Custom title bar window controls via IPC
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.on('window:isMaximized', (e) => {
    e.returnValue = mainWindow?.isMaximized() ?? false;
  });

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized', false));

  return mainWindow;
}

function createTray() {
  const iconPath = path.join(__dirname, '../../build/icon.ico');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open VaultMind', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setToolTip('VaultMind — Local AI Assistant');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

app.whenReady().then(async () => {
  // Show splash first
  splashWindow = createSplashWindow();

  try {
    // Initialize backend services
    await initDatabase();
    await initVectorStore();
    registerAllHandlers();
  } catch (err) {
    console.error('Startup error:', err);
  }

  await createMainWindow();
  try { createTray(); } catch (e) { console.warn('[Main] Tray creation failed (icon missing?):', e.message); }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
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

// Handle app updates / open external links
ipcMain.on('open-external', (_, url) => shell.openExternal(url));
