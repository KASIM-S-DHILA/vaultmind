import { dbGet, dbRun, dbAll } from './sqlite';
import type { Settings } from '../../shared/types';

export function getSetting(key: keyof Settings | string): string | null {
  const row = dbGet<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function updateSetting(key: string, value: string): void {
  dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
}

export function getAllSettings(): Record<string, string> {
  const rows = dbAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}
