import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import { listSessions, createSession, renameSession, deleteSession } from '../database/chat-sessions.repository';

export function registerSessionHandlers(): void {
  ipcMain.handle(IPC.SESSIONS.LIST, async (_event, notebookId: string) => {
    return listSessions(notebookId);
  });

  ipcMain.handle(IPC.SESSIONS.CREATE, async (_event, notebookId: string, title?: string) => {
    const safeTitle = typeof title === 'string' ? title.slice(0, 100) : undefined;
    return createSession(notebookId, safeTitle);
  });

  ipcMain.handle(IPC.SESSIONS.RENAME, async (_event, id: string, title: string) => {
    if (!title || typeof title !== 'string') throw new Error('Invalid title');
    renameSession(id, title.slice(0, 100));
    return { success: true };
  });

  ipcMain.handle(IPC.SESSIONS.DELETE, async (_event, id: string) => {
    if (!id || typeof id !== 'string') throw new Error('Invalid session id');
    deleteSession(id);
    return { success: true };
  });
}
