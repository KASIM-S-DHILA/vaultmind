import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun, dbAll } from './sqlite';
import type { Notebook } from '../../shared/types';

export function listNotebooks(): Notebook[] {
  return dbAll<Notebook>('SELECT * FROM notebooks ORDER BY updated_at DESC');
}

export function createNotebook(title?: string): Notebook | undefined {
  const id = uuidv4();
  const now = Date.now();
  dbRun(
    'INSERT INTO notebooks (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [id, title || 'Untitled Notebook', now, now],
  );
  return getNotebook(id);
}

export function getNotebook(id: string): Notebook | undefined {
  return dbGet<Notebook>('SELECT * FROM notebooks WHERE id = ?', [id]);
}

export function renameNotebook(id: string, title: string): Notebook | undefined {
  dbRun('UPDATE notebooks SET title = ?, updated_at = ? WHERE id = ?', [title, Date.now(), id]);
  return getNotebook(id);
}

export function deleteNotebook(id: string): void {
  dbRun('DELETE FROM notebooks WHERE id = ?', [id]);
}

export function getNotebookGuide(id: string): string | null {
  const row = dbGet<{ guide_json: string }>('SELECT guide_json FROM notebooks WHERE id = ?', [id]);
  return row?.guide_json ?? null;
}

export function updateNotebookGuide(id: string, guideJson: string): void {
  dbRun('UPDATE notebooks SET guide_json = ? WHERE id = ?', [guideJson, id]);
}

export function invalidateNotebookGuide(id: string): void {
  dbRun('UPDATE notebooks SET guide_json = NULL, updated_at = ? WHERE id = ?', [Date.now(), id]);
}

export function touchNotebook(id: string): void {
  dbRun('UPDATE notebooks SET updated_at = ? WHERE id = ?', [Date.now(), id]);
}
