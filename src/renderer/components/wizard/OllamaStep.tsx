import React from 'react';

interface OllamaStepProps {
  ollamaProgress: { status: string; percent: number; message: string };
  pull: { status: string; percent: number; message: string };
}

export default function OllamaStep({ ollamaProgress, pull }: OllamaStepProps) {
  const isPulling = pull.status === 'pulling' || pull.status === 'done' || pull.status === 'error';

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Setting up VaultMind</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
        This one-time setup downloads and configures everything needed. It may take a few minutes depending on your internet speed.
      </p>

      {/* Ollama download step */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', opacity: isPulling ? 0.5 : 1 }}>
        <span style={{ fontSize: 16 }}>
          {ollamaProgress.status === 'done' ? '✅' : ollamaProgress.status === 'error' ? '❌' : '⏳'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>AI Engine (Ollama)</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ollamaProgress.message}</div>
          {(ollamaProgress.status === 'downloading' || ollamaProgress.status === 'installing') && ollamaProgress.percent > 0 && (
            <div className="progress-bar" style={{ marginTop: 6 }}>
              <div className="progress-bar-fill" style={{ width: `${ollamaProgress.percent}%` }} />
            </div>
          )}
        </div>
        {ollamaProgress.status === 'installing' && <div className="spinner spinner-sm" />}
      </div>

      {/* Model download step */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <span style={{ fontSize: 16 }}>
          {pull.status === 'done' ? '✅' : pull.status === 'error' ? '❌' : pull.status === 'idle' ? '⏳' : '⏳'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>AI Model (gemma3:4b)</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{isPulling ? pull.message : 'Waiting for Ollama...'}</div>
          {pull.status === 'pulling' && pull.percent > 0 && (
            <div className="progress-bar" style={{ marginTop: 6 }}>
              <div className="progress-bar-fill" style={{ width: `${pull.percent}%` }} />
            </div>
          )}
        </div>
        {pull.status === 'pulling' && <div className="spinner spinner-sm" />}
      </div>

      {ollamaProgress.status === 'error' && (
        <div style={{ padding: '10px 14px', background: 'var(--error-bg)', borderRadius: 'var(--radius)', border: '1px solid rgba(248,113,113,0.2)', fontSize: 12, color: 'var(--error)', marginBottom: 16 }}>
          ❌ {ollamaProgress.message}
        </div>
      )}

      {pull.status === 'error' && (
        <div style={{ padding: '10px 14px', background: 'var(--error-bg)', borderRadius: 'var(--radius)', border: '1px solid rgba(248,113,113,0.2)', fontSize: 12, color: 'var(--error)', marginBottom: 16 }}>
          ❌ {pull.message}
        </div>
      )}

      {pull.status === 'done' && (
        <div style={{ padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 'var(--radius)', border: '1px solid rgba(52,211,153,0.2)', fontSize: 12, color: 'var(--success)', textAlign: 'center' }}>
          ✅ All components ready! Click "Launch VaultMind" below.
        </div>
      )}
    </div>
  );
}