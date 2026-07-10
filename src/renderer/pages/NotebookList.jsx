import React, { useState, useEffect } from 'react';
import { AppLogo } from '../App';

export default function NotebookList({ onOpenNotebook }) {
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [hovered, setHovered] = useState(null);

  useEffect(() => { loadNotebooks(); }, []);

  async function loadNotebooks() {
    setLoading(true);
    try {
      const list = await window.vaultmind.notebooks.list();
      setNotebooks(list);
    } finally {
      setLoading(false);
    }
  }

  async function createNotebook() {
    setCreating(true);
    const nb = await window.vaultmind.notebooks.create('Untitled Case');
    setNotebooks(prev => [nb, ...prev]);
    setCreating(false);
    onOpenNotebook(nb);
  }

  async function deleteNotebook(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this notebook and all its sources and history?')) return;
    await window.vaultmind.notebooks.delete(id);
    setNotebooks(prev => prev.filter(n => n.id !== id));
  }

  async function startRename(nb, e) {
    e.stopPropagation();
    setRenaming(nb.id);
    setRenameValue(nb.title);
  }

  async function commitRename(id) {
    if (!renameValue.trim()) return;
    const updated = await window.vaultmind.notebooks.rename(id, renameValue.trim());
    setNotebooks(prev => prev.map(n => n.id === id ? updated : n));
    setRenaming(null);
  }

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
      {/* Title bar */}
      <div className="title-bar" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
        <AppLogo size={24} />
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.3 }}>VaultMind</span>
        <span className="badge badge-accent" style={{ marginLeft: 4, fontSize: 10 }}>🔒 Offline</span>
        <div className="title-bar-controls">
          <button className="window-btn" onClick={() => window.vaultmind.window.minimize()}>─</button>
          <button className="window-btn" onClick={() => window.vaultmind.window.maximize()}>□</button>
          <button className="window-btn close" onClick={() => window.vaultmind.window.close()}>✕</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px 40px' }}>
        {/* Hero */}
        <div style={{ marginBottom: 48, maxWidth: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)', background: 'var(--gold-glow)', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(201,162,39,0.25)' }}>
              ⚖ Legal AI Intelligence
            </span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.15, marginBottom: 14 }}>
            Your Confidential<br />
            <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              AI Research Notebooks
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7, maxWidth: 480 }}>
            Analyze contracts, transcribe meetings, and extract insights from confidential documents —
            with zero data leaving your device.
          </p>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          maxWidth: 1200,
        }}>
          {/* New notebook card */}
          <button
            onClick={createNotebook}
            disabled={creating}
            style={{
              background: creating ? 'var(--bg-elevated)' : (hovered === 'new' ? 'var(--accent-glow)' : 'transparent'),
              border: `2px dashed ${hovered === 'new' ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-xl)',
              padding: 28,
              cursor: 'pointer',
              transition: 'all var(--transition)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              minHeight: 160,
              color: hovered === 'new' ? 'var(--accent-light)' : 'var(--text-secondary)',
            }}
            onMouseEnter={() => setHovered('new')}
            onMouseLeave={() => setHovered(null)}
          >
            {creating ? <div className="spinner" /> : (
              <>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>+</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>New Notebook</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>Create a case or project workspace</div>
              </>
            )}
          </button>

          {/* Notebook cards */}
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ borderRadius: 'var(--radius-xl)', minHeight: 160 }} />
            ))
          ) : (
            notebooks.map((nb, idx) => (
              <div
                key={nb.id}
                className="card animate-fade-in"
                onClick={() => onOpenNotebook(nb)}
                style={{
                  padding: 24, cursor: 'pointer', minHeight: 160,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  animationDelay: `${idx * 0.05}s`, borderRadius: 'var(--radius-xl)',
                  ...(hovered === nb.id ? { borderColor: 'var(--border-accent)', boxShadow: 'var(--shadow-accent)' } : {}),
                }}
                onMouseEnter={() => setHovered(nb.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>📁</div>
                  {renaming === nb.id ? (
                    <input
                      className="input"
                      value={renameValue}
                      autoFocus
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(nb.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(nb.id); if (e.key === 'Escape') setRenaming(null); }}
                      onClick={e => e.stopPropagation()}
                      style={{ marginBottom: 4 }}
                    />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, lineHeight: 1.3 }}>{nb.title}</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    Updated {formatDate(nb.updated_at)}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 16 }}>
                  <button
                    className="btn-icon btn"
                    title="Rename"
                    onClick={e => startRename(nb, e)}
                    style={{ fontSize: 13 }}
                  >✏️</button>
                  <button
                    className="btn-icon btn"
                    title="Delete"
                    onClick={e => deleteNotebook(nb.id, e)}
                    style={{ fontSize: 13 }}
                  >🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        height: 'var(--statusbar-height)', borderTop: '1px solid var(--border)',
        background: 'var(--bg-panel)', display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 20, fontSize: 11, color: 'var(--text-tertiary)',
      }}>
        <span>🔒 Fully offline</span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span>{notebooks.length} notebook{notebooks.length !== 1 ? 's' : ''}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <button
            onClick={() => setShowSettings(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11 }}
          >
            ⚙ Settings
          </button>
        </div>
      </div>
    </div>
  );
}
