import { useState, useEffect, useCallback } from 'react';

interface ChatSession {
  id: string;
  notebook_id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

/**
 * Manages chat sessions for a given notebook: listing, creating, renaming,
 * deleting, and tracking the currently active session.
 */
export function useSessions(notebookId: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const list = await window.vaultmind.sessions.list(notebookId);
      setSessions(list);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) return;
    loadSessions();
  }, [notebookId, loadSessions]);

  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  async function createSession() {
    const session = await window.vaultmind.sessions.create(notebookId, 'New Chat');
    if (session) setCurrentSessionId(session.id);
    await loadSessions();
  }

  async function deleteSession(id: string) {
    await window.vaultmind.sessions.delete(id);
    setCurrentSessionId(null);
    await loadSessions();
  }

  async function renameSession(id: string, title: string) {
    await window.vaultmind.sessions.rename(id, title);
    await loadSessions();
  }

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    deleteSession,
    renameSession,
  };
}
