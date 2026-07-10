import React, { useState } from 'react';
import SourceCard from './SourceCard';
import UploadZone from './UploadZone';
import './SourcesPanel.css';

export default function SourcesPanel({ sources, loading, onUpload, onDelete, onToggleActive }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = sources.filter(s => filter === 'all' || s.file_type === filter);

  return (
    <div className="sources-panel">
      <div className="sources-header">
        <span className="panel-section-title" style={{ padding: 0, margin: 0 }}>Sources</span>
        <span className="badge badge-muted">{sources.length}</span>
      </div>

      <div className="sources-upload">
        <UploadZone onUpload={onUpload} />
      </div>

      {sources.length > 1 && (
        <div className="sources-filters">
          {['all', 'pdf', 'txt'].map(f => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'pdf' ? 'PDF' : 'Text'}
            </button>
          ))}
        </div>
      )}

      <div className="sources-list">
        {loading ? (
          [1, 2].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius)' }} />)
        ) : filtered.length === 0 ? (
          <div className="sources-empty">
            <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>No sources yet</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              Upload PDF, TXT, MD, or CSV files to get started
            </div>
          </div>
        ) : (
          filtered.map(source => (
            <SourceCard
              key={source.id}
              source={source}
              expanded={expandedId === source.id}
              onToggle={() => setExpandedId(prev => prev === source.id ? null : source.id)}
              onDelete={() => onDelete(source.id)}
              onToggleActive={() => onToggleActive(source.id, source.active === 0)}
            />
          ))
        )}
      </div>
    </div>
  );
}