import React, { useState } from 'react';
import TypingIndicator from './TypingIndicator';
import './ChatPanel.css';

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Simple inline markdown renderer (no external deps)
function renderMarkdown(text) {
  if (!text) return null;

  // Split text on citation markers like [1], [2]
  const parts = text.split(/(\[\d+\])/g);

  return parts.map((part, i) => {
    const citationMatch = part.match(/^\[(\d+)\]$/);
    if (citationMatch) {
      return (
        <span
          key={i}
          className="citation-badge"
          data-citation={citationMatch[1]}
        >
          {citationMatch[1]}
        </span>
      );
    }

    // Basic markdown for the text part
    const lines = part.split('\n');
    return lines.map((line, j) => {
      if (!line.trim()) return <br key={`${i}-${j}`} />;

      // Escape HTML first to prevent XSS, then process markdown
      let processed = escapeHtml(line);
      // Bold
      processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Italic
      processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Code
      processed = processed.replace(/`(.+?)`/g, '<code>$1</code>');

      if (line.startsWith('# ')) return <h3 key={`${i}-${j}`} dangerouslySetInnerHTML={{ __html: processed.slice(2) }} />;
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <div key={`${i}-${j}`} style={{ paddingLeft: 16 }}>• {line.slice(2)}</div>;
      }
      if (/^\d+\.\s/.test(line)) {
        return <div key={`${i}-${j}`} style={{ paddingLeft: 16 }} dangerouslySetInnerHTML={{ __html: processed }} />;
      }

      return <span key={`${i}-${j}`} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  });
}

export default function MessageBubble({ message, isStreaming, onCitationClick }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const timestamp = message.created_at
    ? new Date(message.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  function handleClick(e) {
    const badge = e.target.closest('.citation-badge');
    if (badge && onCitationClick) {
      const idx = parseInt(badge.dataset.citation) - 1;
      const citation = message.citations?.[idx];
      if (citation) onCitationClick(citation);
    }
  }

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'} ${message.isError ? 'error' : ''}`}>
      <div className="message-avatar">
        {isUser ? 'U' : '⚖'}
      </div>
      <div className="message-content">
        <div className="message-bubble markdown-body" onClick={handleClick}>
          {isStreaming && !message.content ? (
            <TypingIndicator />
          ) : (
            <div>{renderMarkdown(message.content)}</div>
          )}
          {isStreaming && message.content && (
            <span style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--accent)', marginLeft: 2, animation: 'pulse 0.8s ease infinite', verticalAlign: 'text-bottom' }} />
          )}
        </div>

        {/* Copy button */}
        {message.content && !isStreaming && (
          <button
            className="message-copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(message.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            title="Copy to clipboard"
          >
            {copied ? '✓ Copied' : '⎘ Copy'}
          </button>
        )}

        {/* Citations row */}
        {!isUser && message.citations?.length > 0 && (
          <div className="message-citations">
            {message.citations.map((c, i) => (
              <button
                key={i}
                className="citation-source-badge"
                onClick={() => onCitationClick?.(c)}
                title={c.chunkText?.slice(0, 100)}
              >
                <span className="citation-badge" style={{ cursor: 'default' }}>{c.label}</span>
                <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.sourceTitle || 'Source'}
                  {c.page > 0 ? ` p.${c.page}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="message-time">{timestamp}</div>
      </div>
    </div>
  );
}
