/**
 * SQLite database initialisation and convenience accessors.
 *
 * Uses better-sqlite3 (synchronous) with WAL journal mode and foreign keys
 * enabled. Exposes `dbRun`, `dbGet`, and `dbAll` so callers don't need to
 * interact with the Database object directly.
 */
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { runMigrations } from './migrations';
import { logger } from '../../shared/logger';

const DB_PATH = path.join(app.getPath('userData'), 'vaultmind.db');

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  logger.info('DB', 'Initialized at', DB_PATH);
  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function dbRun(sql: string, params: unknown[] = []): Database.RunResult {
  return getDb().prepare(sql).run(params);
}

export function dbGet<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  return getDb().prepare(sql).get(params) as T | undefined;
}

export function dbAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  return getDb().prepare(sql).all(params) as T[];
}
