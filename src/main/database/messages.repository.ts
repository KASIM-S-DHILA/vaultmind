import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun, dbAll, getDb } from './sqlite';
import type { Message } from '../../shared/types';

function hasSessionColumn(): boolean {
  try {
    const cols = getDb().prepare("PRAGMA table_info('messages')").all() as Array<{ name: string }>;
    return cols.some(c => c.name === 'session_id');
  } catch {
    return false;
  }
}

export function getMessageHistory(notebookId: string, sessionId?: string): Message[] {
  if (sessionId && hasSessionColumn()) {
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
  if (sessionId && hasSessionColumn()) {
    dbRun(
      'INSERT INTO messages (id, notebook_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), notebookId, sessionId, 'user', content, Date.now()],
    );
  } else {
    dbRun(
      'INSERT INTO messages (id, notebook_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), notebookId, 'user', content, Date.now()],
    );
  }
}

export function addAssistantMessage(
  notebookId: string,
  content: string,
  citationsJson: string,
  sessionId?: string,
): string {
  const id = uuidv4();
  if (sessionId && hasSessionColumn()) {
    dbRun(
      'INSERT INTO messages (id, notebook_id, session_id, role, content, citations_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, notebookId, sessionId, 'assistant', content, citationsJson, Date.now()],
    );
  } else {
    dbRun(
      'INSERT INTO messages (id, notebook_id, role, content, citations_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, notebookId, 'assistant', content, citationsJson, Date.now()],
    );
  }
  return id;
}

export function clearMessageHistory(notebookId: string, sessionId?: string): void {
  if (sessionId && hasSessionColumn()) {
    dbRun('DELETE FROM messages WHERE session_id = ?', [sessionId]);
  } else {
    dbRun('DELETE FROM messages WHERE notebook_id = ?', [notebookId]);
  }
}
