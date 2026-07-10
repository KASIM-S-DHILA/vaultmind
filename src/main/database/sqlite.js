const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const { runMigrations } = require('./migrations');

const DB_PATH = path.join(app.getPath('userData'), 'vaultmind.db');
let db = null;

function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  console.log('[DB] Initialized at', DB_PATH);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// Helpers with error handling
function dbRun(sql, params = []) {
  return getDb().prepare(sql).run(params);
}

function dbGet(sql, params = []) {
  return getDb().prepare(sql).get(params);
}

function dbAll(sql, params = []) {
  return getDb().prepare(sql).all(params);
}

module.exports = { initDatabase, getDb, dbRun, dbGet, dbAll };
