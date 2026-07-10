import { dbGet, dbRun, dbAll } from './sqlite';
import type { Source } from '../../shared/types';

export function listSources(notebookId: string): Source[] {
  return dbAll<Source>('SELECT * FROM sources WHERE notebook_id = ? ORDER BY created_at DESC', [notebookId]);
}

export function getSource(sourceId: string): Source | undefined {
  return dbGet<Source>('SELECT * FROM sources WHERE id = ?', [sourceId]);
}

export function createSource(source: {
  id: string;
  notebook_id: string;
  filename: string;
  file_type: string;
  file_path: string;
}): void {
  const now = Date.now();
  dbRun(
    'INSERT INTO sources (id, notebook_id, filename, file_type, status, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [source.id, source.notebook_id, source.filename, source.file_type, 'processing', source.file_path, now],
  );
}

export function updateSourceStatus(
  sourceId: string,
  status: string,
  extra: Partial<Pick<Source, 'summary' | 'chunk_count' | 'error_message'>> = {},
): void {
  const sets = ['status = ?', 'updated_at = ?'];
  const params: unknown[] = [status, Date.now()];
  if (extra.summary !== undefined) { sets.push('summary = ?'); params.push(extra.summary); }
  if (extra.chunk_count !== undefined) { sets.push('chunk_count = ?'); params.push(extra.chunk_count); }
  if (extra.error_message !== undefined) { sets.push('error_message = ?'); params.push(extra.error_message); }
  params.push(sourceId);
  dbRun(`UPDATE sources SET ${sets.join(', ')} WHERE id = ?`, params);
}

export function deleteSource(sourceId: string): string | undefined {
  const src = getSource(sourceId);
  dbRun('DELETE FROM sources WHERE id = ?', [sourceId]);
  return src?.notebook_id;
}

export function setSourceActive(sourceId: string, active: boolean): void {
  dbRun('UPDATE sources SET active = ? WHERE id = ?', [active ? 1 : 0, sourceId]);
}

export function getSourceContent(sourceId: string): { filename: string; file_type: string; summary: string | null } | undefined {
  return dbGet<{ filename: string; file_type: string; summary: string | null }>(
    'SELECT filename, file_type, summary FROM sources WHERE id = ?', [sourceId],
  );
}
