const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  console.log('[TEST] App ready, creating window...');

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    x: 100,
    y: 100,
    show: true,
    frame: true,
  });

  win.loadURL('data:text/html,<h1 style="font-family:sans-serif;padding:40px;color:#333">VaultMind Test Window — Electron is working!</h1>');

  win.once('ready-to-show', () => {
    console.log('[TEST] ready-to-show fired');
    win.show();
    win.focus();
  });

  win.on('closed', () => {
    console.log('[TEST] Window closed');
  });

  console.log('[TEST] Window created, ID:', win.id);
});

app.on('window-all-closed', () => app.quit());
