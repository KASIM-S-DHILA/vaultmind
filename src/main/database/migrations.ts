import Database from 'better-sqlite3';
import { logger } from '../../shared/logger';

interface Migration {
  version: number;
  up: (db: Database.Database) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS notebooks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL DEFAULT 'Untitled Notebook',
          guide_json TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sources (
          id TEXT PRIMARY KEY,
          notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_path TEXT,
          file_size INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'processing',
          summary TEXT,
          chunk_count INTEGER DEFAULT 0,
          transcript TEXT,
          error_message TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          citations_json TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
          content TEXT DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY
        );
        CREATE INDEX IF NOT EXISTS idx_sources_notebook ON sources(notebook_id);
        CREATE INDEX IF NOT EXISTS idx_messages_notebook ON messages(notebook_id);
        CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id);
      `);

      const defaults: [string, string][] = [
        ['ollama_model', 'gemma3:4b'],
        ['ollama_url', 'http://127.0.0.1:11434'],
        ['embedding_model', 'nomic-embed-text-v1.5'],
        ['llm_context_size', '4096'],
        ['llm_temperature', '0.3'],
        ['retrieval_top_k', '5'],
        ['chunk_size', '500'],
        ['chunk_overlap', '50'],
        ['setup_complete', 'false'],
      ];
      const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
      for (const [k, v] of defaults) insert.run(k, v);
    },
  },
  {
    version: 2,
    up: (db) => {
      db.exec("ALTER TABLE sources ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
    },
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)');
  const row = db.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number } | undefined;
  const current = row?.v ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      logger.info('DB', 'Running migration v' + migration.version);
      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(migration.version);
      })();
    }
  }
}
