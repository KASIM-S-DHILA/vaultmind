import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun, dbAll } from './sqlite';

export interface ChatSession {
  id: string;
  notebook_id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export function listSessions(notebookId: string): ChatSession[] {
  return dbAll<ChatSession>(
    'SELECT * FROM chat_sessions WHERE notebook_id = ? ORDER BY updated_at DESC',
    [notebookId],
  );
}

export function createSession(notebookId: string, title?: string): ChatSession | undefined {
  const id = uuidv4();
  const now = Date.now();
  dbRun(
    'INSERT INTO chat_sessions (id, notebook_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, notebookId, title || 'New Chat', now, now],
  );
  return getSession(id);
}

export function getSession(id: string): ChatSession | undefined {
  return dbGet<ChatSession>('SELECT * FROM chat_sessions WHERE id = ?', [id]);
}

export function renameSession(id: string, title: string): void {
  dbRun('UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?', [title, Date.now(), id]);
}

export function deleteSession(id: string): void {
  dbRun('DELETE FROM messages WHERE session_id = ?', [id]);
  dbRun('DELETE FROM chat_sessions WHERE id = ?', [id]);
}

export function ensureDefaultSession(notebookId: string): ChatSession {
  const sessions = listSessions(notebookId);
  if (sessions.length > 0) return sessions[0];
  return createSession(notebookId, 'Chat 1')!;
}
