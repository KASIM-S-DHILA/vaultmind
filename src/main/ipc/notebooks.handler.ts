/**
 * Notebook IPC: list, create, rename, delete notebooks, and get cached or
 * freshly-generated notebook guides.
 *
 * Deleting a notebook cascades to its sources, vectors, messages, and notes.
 */
import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import {
  listNotebooks,
  createNotebook,
  renameNotebook,
  deleteNotebook,
  getNotebookGuide,
  updateNotebookGuide,
  invalidateNotebookGuide,
} from '../database/notebooks.repository';
import { deleteSourceVectors } from '../engine/vector-store';
import { generateNotebookGuide } from '../engine/summarizer';
import { dbAll, dbRun } from '../database/sqlite';
import { clearMessageHistory } from '../database/messages.repository';
import { logger } from '../../shared/logger';

export function registerNotebookHandlers(): void {
  ipcMain.handle(IPC.NOTEBOOKS.LIST, async () => {
    return listNotebooks();
  });

  ipcMain.handle(IPC.NOTEBOOKS.CREATE, async (_event, title?: string) => {
    const safeTitle = typeof title === 'string' ? title.slice(0, 200) : undefined;
    return createNotebook(safeTitle);
  });

  ipcMain.handle(IPC.NOTEBOOKS.RENAME, async (_event, id: string, title: string) => {
    if (!title || typeof title !== 'string') throw new Error('Invalid title');
    return renameNotebook(id, title.slice(0, 200));
  });

  ipcMain.handle(IPC.NOTEBOOKS.DELETE, async (_event, id: string) => {
    try {
      const sources = dbAll<{ id: string }>('SELECT id FROM sources WHERE notebook_id = ?', [id]);
      for (const src of sources) {
        await deleteSourceVectors(src.id).catch(() => {});
      }
    } catch (err) {
      logger.warn('Notebooks', 'Failed to delete source vectors:', err instanceof Error ? err.message : String(err));
    }
    clearMessageHistory(id);
    dbRun('DELETE FROM notes WHERE notebook_id = ?', [id]);
    dbRun('DELETE FROM sources WHERE notebook_id = ?', [id]);
    deleteNotebook(id);
    return { success: true };
  });

  ipcMain.handle(IPC.NOTEBOOKS.GET_GUIDE, async (_event, id: string, sourceIds?: string[]) => {
    if (sourceIds) {
      const guide = await generateNotebookGuide(id, sourceIds);
      updateNotebookGuide(id, JSON.stringify(guide));
      return guide;
    }
    const cached = getNotebookGuide(id);
    if (cached) return JSON.parse(cached);
    return { overview: '', keyThemes: [], suggestedQuestions: [] };
  });
}
