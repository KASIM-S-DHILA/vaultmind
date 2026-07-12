import { useState, useEffect, useCallback } from 'react';
import type { Source, UploadProgress } from '../../shared/types';

export function useSources(notebookId: string) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSources = useCallback(async () => {
    try {
      const list = await window.vaultmind.sources.list(notebookId);
      setSources(list);
    } catch {
      // Silently fail — loading will remain empty
    } finally {
      setLoading(false);
    }
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) return;
    loadSources();
  }, [notebookId, loadSources]);

  useEffect(() => {
    const cleanup = window.vaultmind.sources.onProgress((data: UploadProgress) => {
      if (data.status === 'ready' || data.status === 'error') {
        loadSources();
      } else if (data.status === 'processing') {
        setSources(prev => prev.map(s =>
          s.id === data.sourceId
            ? { ...s, progress: data.progress, status: 'processing' as const }
            : s
        ));
      }
    });
    return cleanup;
  }, [loadSources]);

  async function uploadFiles(filePaths: string[]) {
    await window.vaultmind.sources.upload(notebookId, filePaths);
    loadSources();
  }

  async function deleteSource(sourceId: string) {
    await window.vaultmind.sources.delete(sourceId);
    loadSources();
  }

  async function setSourceActive(sourceId: string, active: boolean) {
    await window.vaultmind.sources.setActive(sourceId, active);
    loadSources();
  }

  return { sources, loading, uploadFiles, deleteSource, setSourceActive };
}
