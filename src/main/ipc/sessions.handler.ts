import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import { listSessions, createSession, renameSession, deleteSession } from '../database/chat-sessions.repository';

export function registerSessionHandlers(): void {
  ipcMain.handle(IPC.SESSIONS.LIST, async (_event, notebookId: string) => {
    return listSessions(notebookId);
  });

  ipcMain.handle(IPC.SESSIONS.CREATE, async (_event, notebookId: string, title?: string) => {
    return createSession(notebookId, title);
  });

  ipcMain.handle(IPC.SESSIONS.RENAME, async (_event, id: string, title: string) => {
    renameSession(id, title);
    return { success: true };
  });

  ipcMain.handle(IPC.SESSIONS.DELETE, async (_event, id: string) => {
    deleteSession(id);
    return { success: true };
  });
}
