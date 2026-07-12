/**
 * Key-value settings store backed by the `settings` SQLite table.
 *
 * Sensitive keys (`google_api_key`, `google_search_engine_id`) are encrypted
 * at rest using Electron's `safeStorage`.  `getAllSettings` returns them
 * masked (`[set]` / `''`) so the renderer never sees the plaintext value.
 */
import { safeStorage } from 'electron';
import { dbGet, dbRun, dbAll } from './sqlite';
import type { Settings } from '../../shared/types';

const SENSITIVE_KEYS = new Set(['google_api_key', 'google_search_engine_id']);

function encrypt(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) return value;
  return safeStorage.encryptString(value).toString('base64');
}

function decrypt(encoded: string): string {
  if (!safeStorage.isEncryptionAvailable()) return encoded;
  try {
    return safeStorage.decryptString(Buffer.from(encoded, 'base64'));
  } catch {
    return encoded;
  }
}

function isEncrypted(value: string): boolean {
  try {
    Buffer.from(value, 'base64');
    return true;
  } catch {
    return false;
  }
}

export function getSetting(key: keyof Settings | string): string | null {
  const row = dbGet<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  if (row?.value == null) return null;
  if (SENSITIVE_KEYS.has(key)) return decrypt(row.value);
  return row.value;
}

export function updateSetting(key: string, value: string): void {
  const stored = SENSITIVE_KEYS.has(key) && value ? encrypt(String(value)) : String(value);
  dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, stored]);
}

export function getAllSettings(): Record<string, string> {
  const rows = dbAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const { key, value } of rows) {
    if (SENSITIVE_KEYS.has(key)) {
      settings[key] = value && (!isEncrypted(value) || decrypt(value)) ? '[set]' : '';
    } else {
      settings[key] = value;
    }
  }
  return settings;
}
