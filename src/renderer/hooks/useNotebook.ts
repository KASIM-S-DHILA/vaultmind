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
    } catch {
      setGuide(null);
    } finally {
      setGuideLoading(false);
    }
  }

  async function loadNotes() {
    try {
      const result = await window.vaultmind.notes.get(notebookId);
      if (result) setNotes(result.content || '');
    } catch {
      // Silently fail
    }
  }

  async function saveNotes(content: string) {
    setNotes(content);
    try {
      await window.vaultmind.notes.save(notebookId, content);
    } catch {
      // Silently fail
    }
  }

  async function refreshGuide(sourceIds?: string[]) {
    await loadGuide(sourceIds);
  }

  return { guide, guideLoading, notes, saveNotes, refreshGuide };
}
