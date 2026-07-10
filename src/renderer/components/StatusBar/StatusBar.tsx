import React from 'react';
import type { Source } from '../../../shared/types';

interface StatusBarProps {
  sources: Source[];
  isStreaming: boolean;
  ollamaStatus: string;
  activeModel: string;
}

export default function StatusBar({ sources, isStreaming, ollamaStatus, activeModel }: StatusBarProps) {
  return (
    <div style={{
      height: 'var(--statusbar-height)',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-panel)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 16,
      fontSize: 11, color: 'var(--text-tertiary)',
      flexShrink: 0,
    }}>
      {ollamaStatus === 'ready' && <span style={{ color: 'var(--success)', fontWeight: 500 }}>● Connected</span>}
      {ollamaStatus === 'checking' && <span style={{ color: 'var(--text-tertiary)' }}>● Checking...</span>}
      {ollamaStatus === 'starting' && <span style={{ color: 'var(--warning)', animation: 'pulse 1s infinite' }}>● Starting Ollama...</span>}
      {ollamaStatus === 'error' && <span style={{ color: 'var(--error)' }}>● Ollama Error</span>}
      <span>Sources: {sources.filter(s => s.status === 'ready').length}</span>
      <span>Chunks: {sources.reduce((a, s) => a + (s.chunk_count || 0), 0)}</span>
      {isStreaming && <span style={{ color: 'var(--accent-light)', animation: 'pulse 1s infinite' }}>● Generating...</span>}
      <div style={{ marginLeft: 'auto' }}>
        <span>Model: {activeModel || 'Loading...'}</span>
      </div>
    </div>
  );
}
