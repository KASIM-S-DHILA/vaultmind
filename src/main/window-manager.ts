/**
 * Window and system-tray management.
 *
 * `createMainWindow` sets up a frameless BrowserWindow with hidden title bar,
 * loads the renderer via Vite dev server or built files, and wires window-
 * control IPC channels (minimise, maximise, close).
 *
 * `createTray` adds a system-tray icon with a context menu.
 */
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { IPC } from '../shared/constants';
import { WINDOW_DEFAULTS } from '../shared/constants';
import { logger } from '../shared/logger';

const ICON_PATH = '../../build/icon.ico';

export function createMainWindow(splashWindow: BrowserWindow | null): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: WINDOW_DEFAULTS.WIDTH,
    height: WINDOW_DEFAULTS.HEIGHT,
    minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
    minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
    x: 100,
    y: 100,
    show: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0b0f',
    icon: path.join(__dirname, ICON_PATH),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Main', 'Renderer process gone!', details.reason, details.exitCode);
  });
  mainWindow.webContents.on('unresponsive', () => {
    logger.error('Main', 'Renderer became unresponsive!');
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logger.error('Main', 'Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.once('ready-to-show', () => {
    logger.info('Main', 'MainWindow ready-to-show');
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
    mainWindow.focus();
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    logger.info('Main', 'MainWindow closed');
  });

  // Window controls
  ipcMain.on(IPC.WINDOW.MINIMIZE, () => mainWindow?.minimize());
  ipcMain.on(IPC.WINDOW.MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on(IPC.WINDOW.CLOSE, () => mainWindow?.close());
  ipcMain.on(IPC.WINDOW.IS_MAXIMIZED, (e) => {
    e.returnValue = mainWindow?.isMaximized() ?? false;
  });

  mainWindow.on('maximize', () => mainWindow.webContents.send(IPC.WINDOW.MAXIMIZED, true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send(IPC.WINDOW.MAXIMIZED, false));

  return mainWindow;
}

export function createTray(mainWindow: BrowserWindow | null): Tray | null {
  try {
    const iconPath = path.join(__dirname, ICON_PATH);
    const icon = nativeImage.createFromPath(iconPath);
    const tray = new Tray(icon.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open VaultMind',
        click: () => { mainWindow?.show(); mainWindow?.focus(); },
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);

    tray.setToolTip('VaultMind — Private Source-Grounded AI');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
    return tray;
  } catch (e) {
    logger.warn('Main', 'Tray creation failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

