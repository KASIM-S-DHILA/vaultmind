import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import { getNote, saveNote } from '../database/notes.repository';

export function registerNoteHandlers(): void {
  ipcMain.handle(IPC.NOTES.GET, async (_event, notebookId: string) => {
    return getNote(notebookId);
  });

  ipcMain.handle(IPC.NOTES.SAVE, async (_event, notebookId: string, content: string) => {
    saveNote(notebookId, content);
    return { success: true };
  });
}
