import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IPC } from '../../shared/constants';
import {
  listSources,
  createSource,
  deleteSource,
  setSourceActive,
  getSourceContent,
  updateSourceStatus,
} from '../database/sources.repository';
import { invalidateNotebookGuide } from '../database/notebooks.repository';
import { deleteSourceVectors } from '../engine/vector-store';
import { processFile } from '../processors';
import { logger } from '../../shared/logger';

export function registerSourceHandlers(): void {
  ipcMain.handle(IPC.DIALOG.SELECT_FILES, async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select Documents for VaultMind',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'txt', 'md', 'csv'] },
      ],
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle(IPC.SOURCES.LIST, async (_event, notebookId: string) => {
    return listSources(notebookId);
  });

  ipcMain.handle(IPC.SOURCES.UPLOAD, async (event, notebookId: string, filePaths: string[]) => {
    const results: Array<{ id: string; filename: string; fileType: string; status: string }> = [];

    for (const filePath of filePaths) {
      const id = uuidv4();
      const filename = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase().slice(1);
      const fileType = ext;

      createSource({ id, notebook_id: notebookId, filename, file_type: fileType, file_path: filePath });
      results.push({ id, filename, fileType, status: 'processing' });

      setImmediate(async () => {
        try {
          const sendProgress = (data: Record<string, unknown>) => {
            event.sender.send(IPC.SOURCES.PROGRESS, { sourceId: id, ...data });
          };
          await processFile({ id, filePath, fileType, notebookId, sendProgress });
          invalidateNotebookGuide(notebookId);
          event.sender.send(IPC.SOURCES.PROGRESS, { sourceId: id, status: 'ready', progress: 100 });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          updateSourceStatus(id, 'error', { error_message: message });
          event.sender.send(IPC.SOURCES.PROGRESS, { sourceId: id, status: 'error', error: message });
        }
      });
    }

    return results;
  });

  ipcMain.handle(IPC.SOURCES.DELETE, async (_event, sourceId: string) => {
    await deleteSourceVectors(sourceId);
    const notebookId = deleteSource(sourceId);
    if (notebookId) invalidateNotebookGuide(notebookId);
    return { success: true };
  });

  ipcMain.handle(IPC.SOURCES.GET_CONTENT, async (_event, sourceId: string) => {
    return getSourceContent(sourceId);
  });

  ipcMain.handle(IPC.SOURCES.SET_ACTIVE, async (_event, sourceId: string, active: boolean) => {
    setSourceActive(sourceId, active);
    return { success: true };
  });
}
