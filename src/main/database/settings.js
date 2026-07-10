const { dbGet, dbRun, dbAll } = require('./sqlite');

function getSetting(key) {
  const row = dbGet('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

function updateSetting(key, value) {
  dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
}

function getAllSettings() {
  const rows = dbAll('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

module.exports = { getSetting, updateSetting, getAllSettings };
