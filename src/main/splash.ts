import { BrowserWindow } from 'electron';
import path from 'path';

const ICON_PATH = '../../build/icon.ico';

export function createSplashWindow(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 480,
    height: 360,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    center: true,
    skipTaskbar: true,
    icon: path.join(__dirname, ICON_PATH),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'splash-preload.js'),
    },
  });

  splash.loadFile(path.join(__dirname, '../../build/splash.html'));
  return splash;
}
