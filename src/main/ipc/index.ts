/**
 * IPC handler registration hub.
 *
 * Every domain handler is registered here. The single `registerAllHandlers()`
 * call in `index.ts` wires everything up. Add new handlers by importing and
 * calling the relevant `register*` function below.
 */
import { ipcMain, shell, BrowserWindow } from 'electron';
import { IPC } from '../../shared/constants';
import { registerNotebookHandlers } from './notebooks.handler';
import { registerSourceHandlers } from './sources.handler';
import { registerChatHandlers } from './chat.handler';
import { registerNoteHandlers } from './notes.handler';
import { registerSessionHandlers } from './sessions.handler';
import { registerSettingsHandlers } from './settings.handler';
import { registerOllamaHandlers } from './ollama.handler';
import { registerSetupHandlers } from './setup.handler';

export function registerAllHandlers(): void {
  registerNotebookHandlers();
  registerSourceHandlers();
  registerChatHandlers();
  registerNoteHandlers();
  registerSessionHandlers();
  registerSettingsHandlers();
  registerOllamaHandlers();
  registerSetupHandlers();

  // External links
  ipcMain.on(IPC.EXTERNAL.OPEN, (_event, url: string) => shell.openExternal(url));

  // DevTools (Ctrl+Shift+I)
  ipcMain.on(IPC.WINDOW.DEVTOOLS, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.webContents.openDevTools();
  });
}
