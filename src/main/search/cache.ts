import { getDb } from '../database/sqlite';
import { logger } from '../../shared/logger';

const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const TABLE_NAME = 'web_cache';

interface CacheRow {
  url: string;
  title: string;
  markdown: string;
  snippet: string;
  fetched_at: number;
}

function ensureTable(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    url TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    markdown TEXT NOT NULL DEFAULT '',
    snippet TEXT NOT NULL DEFAULT '',
    fetched_at INTEGER NOT NULL
  )`);
}

export function getCached(url: string): { title: string; markdown: string; snippet: string; fetchedAt: number } | null {
  ensureTable();
  const row = getDb().prepare<[string]>(`SELECT * FROM ${TABLE_NAME} WHERE url = ?`).get(url) as CacheRow | undefined;
  if (!row) return null;
  if (Date.now() - row.fetched_at > TTL_MS) {
    getDb().prepare(`DELETE FROM ${TABLE_NAME} WHERE url = ?`).run(url);
    return null;
  }
  logger.info('WebCache', `Cache HIT for ${url.slice(0, 80)}`);
  return { title: row.title, markdown: row.markdown, snippet: row.snippet, fetchedAt: row.fetched_at };
}

export function setCached(url: string, title: string, markdown: string, snippet: string): void {
  ensureTable();
  getDb().prepare(`INSERT OR REPLACE INTO ${TABLE_NAME} (url, title, markdown, snippet, fetched_at) VALUES (?, ?, ?, ?, ?)`)
    .run(url, title, markdown, snippet, Date.now());
}
