import React, { useState, useEffect } from 'react';
import './SourcesPanel.css';

const FILE_ICONS = { pdf: '📄', txt: '📝', md: '📝', audio: '🎙️', csv: '📊' };
const STATUS_BADGES = {
  ready: { label: 'Ready', cls: 'badge-success' },
  processing: { label: 'Processing', cls: 'badge-warning' },
  error: { label: 'Error', cls: 'badge-error' },
  uploading: { label: 'Uploading', cls: 'badge-muted' },
};

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SourceCard({ source, expanded, onToggle, onDelete }) {
  const [content, setContent] = useState(null);

  const icon = FILE_ICONS[source.file_type] || '📎';
  const statusInfo = STATUS_BADGES[source.status] || STATUS_BADGES.processing;

  async function loadContent() {
    if (content || source.status !== 'ready') return;
    const data = await window.vaultmind.sources.getContent(source.id);
    setContent(data);
  }

  useEffect(() => {
    if (expanded) loadContent();
  }, [expanded]);

  return (
    <div className={`source-card ${expanded ? 'expanded' : ''} animate-fade-in`}>
      <div className="source-card-header" onClick={onToggle}>
        <div className="source-icon">{icon}</div>
        <div className="source-info">
          <div className="source-filename" title={source.filename}>{source.filename}</div>
          <div className="source-meta">
            {formatSize(source.file_size)}
            {source.chunk_count > 0 && ` · ${source.chunk_count} chunks`}
            {source.status === 'processing' && source.progress !== undefined && ` · ${Math.round(source.progress)}%`}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className={`badge ${statusInfo.cls}`}>
            {source.status === 'processing' && <span className="animate-pulse">⏳</span>} {statusInfo.label}
          </span>
          <div className="source-actions">
            <button
              className="btn btn-icon"
              title="Delete"
              style={{ fontSize: 12, width: 24, height: 24 }}
              onClick={e => { e.stopPropagation(); onDelete(); }}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar for processing */}
      {source.status === 'processing' && (
        <div className="source-progress">
          <div
            className={`source-progress-fill ${source.progress === undefined ? 'indeterminate' : ''}`}
            style={{ width: `${source.progress || 0}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {source.status === 'error' && (
        <div style={{ padding: '6px 12px 10px', fontSize: 11, color: 'var(--error)' }}>
          ⚠ {source.error_message || 'Processing failed'}
        </div>
      )}

      {/* Source summary preview */}
      {source.status === 'ready' && source.summary && !expanded && (
        <div style={{
          padding: '0 12px 10px',
          fontSize: 11, color: 'var(--text-tertiary)',
          lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {source.summary}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="source-content">
          {!content ? (
            <div className="spinner spinner-sm" style={{ margin: '20px auto' }} />
          ) : (
            <>
              {content.summary && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Summary
                  </div>
                  <p>{content.summary}</p>
                </div>
              )}
              {content.transcript ? (
                <>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Transcript
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font)', fontSize: 11 }}>{content.transcript}</pre>
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
