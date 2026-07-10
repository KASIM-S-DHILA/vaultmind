import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun } from './sqlite';

interface NoteRow {
  id: string;
  notebook_id: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export function getNote(notebookId: string): NoteRow | undefined {
  return dbGet<NoteRow>('SELECT content FROM notes WHERE notebook_id = ?', [notebookId]);
}

export function saveNote(notebookId: string, content: string): void {
  const existing = dbGet<{ id: string }>('SELECT id FROM notes WHERE notebook_id = ?', [notebookId]);
  if (existing) {
    dbRun('UPDATE notes SET content = ?, updated_at = ? WHERE notebook_id = ?', [content, Date.now(), notebookId]);
  } else {
    dbRun(
      'INSERT INTO notes (id, notebook_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), notebookId, content, Date.now(), Date.now()],
    );
  }
}
