import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun, dbAll } from './sqlite';
import type { Message } from '../../shared/types';

export function getMessageHistory(notebookId: string, sessionId?: string): Message[] {
  if (sessionId) {
    return dbAll<Message>(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId],
    );
  }
  return dbAll<Message>(
    'SELECT * FROM messages WHERE notebook_id = ? ORDER BY created_at ASC',
    [notebookId],
  );
}

export function addUserMessage(notebookId: string, content: string, sessionId?: string): void {
  dbRun(
    'INSERT INTO messages (id, notebook_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), notebookId, sessionId || null, 'user', content, Date.now()],
  );
}

export function addAssistantMessage(
  notebookId: string,
  content: string,
  citationsJson: string,
  sessionId?: string,
): string {
  const id = uuidv4();
  dbRun(
    'INSERT INTO messages (id, notebook_id, session_id, role, content, citations_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, notebookId, sessionId || null, 'assistant', content, citationsJson, Date.now()],
  );
  return id;
}

export function clearMessageHistory(notebookId: string, sessionId?: string): void {
  if (sessionId) {
    dbRun('DELETE FROM messages WHERE session_id = ?', [sessionId]);
  } else {
    dbRun('DELETE FROM messages WHERE notebook_id = ?', [notebookId]);
  }
}
