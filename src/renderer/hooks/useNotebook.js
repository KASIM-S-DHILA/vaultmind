import { useState, useEffect } from 'react';

export function useNotebook(notebookId) {
  const [guide, setGuide] = useState(null);
  const [notes, setNotes] = useState('');
  const [guideLoading, setGuideLoading] = useState(false);

  useEffect(() => {
    if (!notebookId) return;
    loadGuide();
    loadNotes();
  }, [notebookId]);

  async function loadGuide() {
    setGuideLoading(true);
    try {
      const g = await window.vaultmind.notebooks.getGuide(notebookId);
      setGuide(g);
    } catch (e) {
      console.error('Guide load error:', e);
    } finally {
      setGuideLoading(false);
    }
  }

  async function loadNotes() {
    const n = await window.vaultmind.notes.get(notebookId);
    setNotes(n?.content || '');
  }

  async function saveNotes(content) {
    setNotes(content);
    await window.vaultmind.notes.save(notebookId, content);
  }

  return { guide, guideLoading, notes, saveNotes, refreshGuide: loadGuide };
}
