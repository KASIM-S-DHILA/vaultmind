const MIGRATIONS = [
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

      // Default settings
      const defaults = [
        ['llm_model', 'Phi-4-mini-Q4_K_M.gguf'],
        ['embedding_model', 'all-MiniLM-L6-v2'],
        ['whisper_model', 'ggml-base.bin'],
        ['llm_context_size', '4096'],
        ['llm_temperature', '0.3'],
        ['retrieval_top_k', '5'],
        ['chunk_size', '500'],
        ['chunk_overlap', '50'],
        ['setup_complete', 'false'],
        ['gpu_layers', '0'],
      ];
      const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
      for (const [k, v] of defaults) insert.run(k, v);
    },
  },
  // Future migrations go here: { version: 2, up: (db) => { ... } }
];

function runMigrations(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)');
  const current = db.prepare('SELECT MAX(version) as v FROM schema_version').get()?.v || 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      console.log(`[DB] Running migration v${migration.version}`);
      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(migration.version);
      })();
    }
  }
}

module.exports = { runMigrations };
