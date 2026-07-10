const { BrowserWindow } = require('electron');
const path = require('path');

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    center: true,
    skipTaskbar: true,
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splash.loadFile(path.join(__dirname, '../../build/splash.html'));
  return splash;
}

module.exports = { createSplashWindow };
