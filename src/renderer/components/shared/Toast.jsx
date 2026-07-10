import React from 'react';
import { useToast } from '../../hooks/useToast';

const ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

export default function Toast() {
  const { toasts, removeToast } = useToast();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
          <span style={{ flexShrink: 0 }}>{ICONS[t.type] || '•'}</span>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
