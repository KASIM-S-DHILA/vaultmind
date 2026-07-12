import { useState, useEffect } from 'react';
import type { NotebookGuide } from '../../shared/types';

export function useNotebook(notebookId: string) {
  const [guide, setGuide] = useState<NotebookGuide | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!notebookId) return;
    loadGuide();
    loadNotes();
  }, [notebookId]);

  async function loadGuide(sourceIds?: string[]) {
    if (!notebookId) return;
    setGuideLoading(true);
    try {
      const result = await window.vaultmind.notebooks.getGuide(notebookId, sourceIds);
      setGuide(result);
    } catch (err) {
      console.warn('Failed to load guide:', err instanceof Error ? err.message : String(err));
      setGuide(null);
    } finally {
      setGuideLoading(false);
    }
  }

  async function loadNotes() {
    try {
      const result = await window.vaultmind.notes.get(notebookId);
      if (result) setNotes(result.content || '');
    } catch (err) {
      console.warn('Failed to load notes:', err instanceof Error ? err.message : String(err));
    }
  }

  async function saveNotes(content: string) {
    setNotes(content);
    try {
      await window.vaultmind.notes.save(notebookId, content);
    } catch (err) {
      console.warn('Failed to save notes:', err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshGuide(sourceIds?: string[]) {
    await loadGuide(sourceIds);
  }

  return { guide, guideLoading, notes, saveNotes, refreshGuide };
}
