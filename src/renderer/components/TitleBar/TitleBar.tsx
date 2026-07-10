import React, { useState, useEffect } from 'react';

interface TitleBarProps {
  title: string;
  onBack: () => void;
  onRename: (title: string) => Promise<void>;
  onOpenSettings: () => void;
}

export default function TitleBar({ title, onBack, onRename, onOpenSettings }: TitleBarProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(title);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    setEditTitleValue(title);
  }, [title]);

  useEffect(() => {
    const cleanup = window.vaultmind.window.onMaximizeChange((val: boolean) => {
      setIsMaximized(val);
    });
    return cleanup;
  }, []);

  async function commitTitle() {
    const val = editTitleValue.trim();
    if (val && val !== title) {
      await onRename(val);
    }
    setEditingTitle(false);
  }

  function startEditTitle() {
    setEditTitleValue(title);
    setEditingTitle(true);
  }

  return (
    <div className="title-bar" style={{
      background: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border)',
      padding: '0 12px 0 16px',
    }}>
      <button
        onClick={onBack}
        style={{ WebkitAppRegion: 'no-drag', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
      >
        ← Notebooks
      </button>

      <div className="divider-vertical" style={{ height: 16, margin: '0 8px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>📁</span>
        {editingTitle ? (
          <input
            className="input"
            value={editTitleValue}
            autoFocus
            onChange={e => setEditTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
            onClick={e => e.stopPropagation()}
            style={{ height: 28, fontSize: 13, padding: '0 8px', width: 240 }}
          />
        ) : (
          <span
            style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.3, cursor: 'pointer', WebkitAppRegion: 'no-drag' }}
            onClick={startEditTitle}
            title="Click to rename"
          >
            {title}
          </span>
        )}
      </div>

      <span className="badge badge-accent" style={{ marginLeft: 8, fontSize: 10 }}>🔒 Offline</span>

      <div className="title-bar-controls">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onOpenSettings}
          style={{ fontSize: 12, WebkitAppRegion: 'no-drag' }}
        >
          ⚙ Settings
        </button>
        <div className="divider-vertical" style={{ height: 16, margin: '0 4px' }} />
        <button className="window-btn" onClick={() => window.vaultmind.window.minimize()}>─</button>
        <button className="window-btn" onClick={() => window.vaultmind.window.maximize()}>□</button>
        <button className="window-btn close" onClick={() => window.vaultmind.window.close()}>✕</button>
      </div>
    </div>
  );
}
