import { useState, useEffect, useCallback } from 'react';

export function useSources(notebookId) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSources = useCallback(async () => {
    if (!notebookId) return;
    setLoading(true);
    try {
      const list = await window.vaultmind.sources.list(notebookId);
      setSources(list);
    } finally {
      setLoading(false);
    }
  }, [notebookId]);

  useEffect(() => {
    loadSources();

    // Listen for real-time progress updates
    const unsub = window.vaultmind.sources.onProgress((data) => {
      setSources(prev => prev.map(s =>
        s.id === data.sourceId
          ? { ...s, status: data.status, progress: data.progress, error_message: data.error }
          : s
      ));
    });

    return unsub;
  }, [notebookId]);

  async function uploadFiles() {
    const filePaths = await window.vaultmind.selectFiles();
    if (!filePaths.length) return;

    const newSources = await window.vaultmind.sources.upload(notebookId, filePaths);
    setSources(prev => [...newSources, ...prev]);
  }

  async function deleteSource(sourceId) {
    await window.vaultmind.sources.delete(sourceId);
    setSources(prev => prev.filter(s => s.id !== sourceId));
  }

  return { sources, loading, uploadFiles, deleteSource, refresh: loadSources };
}
