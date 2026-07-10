import React from 'react';
import { OLLAMA_PRESETS } from '../../../shared/constants';

interface OllamaStepProps {
  status: { installed: boolean | null; running: boolean; checking: boolean; version?: string };
  pull: { status: string; percent: number; message: string };
  onPull: () => void;
  models: Array<{ name: string }>;
  selectedModel: string;
  onSelectModel: (name: string) => void;
  onRefresh: () => void;
  skip: boolean;
  onSkip: (skip: boolean) => void;
}

export default function OllamaStep({ status, pull, onPull, models, selectedModel, onSelectModel, onRefresh, skip, onSkip }: OllamaStepProps) {
  const modelAlreadyDownloaded = models.some(m => m.name === selectedModel);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Ollama AI Model</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
        VaultMind uses <strong style={{ color: 'var(--text-primary)' }}>Ollama</strong> to run AI models locally.
        Pull a model to get started.
      </p>

      {status.checking ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
          <div className="spinner spinner-sm" />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Checking for Ollama...</span>
        </div>
      ) : !status.installed ? (
        <div style={{ padding: 16, background: 'var(--warning-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(251,191,36,0.3)', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--warning)' }}>⚠️ Ollama Not Installed</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
            VaultMind requires Ollama to run AI models. Download and install it from{' '}
            <a href="#" onClick={e => { e.preventDefault(); window.vaultmind.openExternal('https://ollama.com'); }}
              style={{ color: 'var(--accent-light)' }}>ollama.com</a>
            , then come back here.
          </p>
          <button className="btn btn-secondary" onClick={onRefresh}>🔄 Check Again</button>
        </div>
      ) : !status.running ? (
        <div style={{ padding: 16, background: 'var(--warning-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(251,191,36,0.3)', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--warning)' }}>⚠️ Ollama Server Not Running</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
            Ollama is installed but the server is not running.
          </p>
          <button className="btn btn-primary" onClick={async () => { await window.vaultmind.ollama.checkRunning(); setTimeout(onRefresh, 3000); }}>
            🔄 Start & Check Again
          </button>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 'var(--radius)', border: '1px solid rgba(52,211,153,0.2)', marginBottom: 16 }}>
            <span style={{ color: 'var(--success)', fontSize: 16 }}>●</span>
            <span style={{ fontSize: 13, color: 'var(--success)' }}>Ollama connected</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{status.version}</span>
            {models.length > 0 && (
              <span className="badge badge-success" style={{ marginLeft: 'auto' }}>{models.length} model{models.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Select a model to pull:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {OLLAMA_PRESETS.map(m => {
                const downloaded = models.some(dm => dm.name === m.name);
                const active = selectedModel === m.name;
                return (
                  <button
                    key={m.name}
                    onClick={() => onSelectModel(m.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', textAlign: 'left',
                      background: active ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                      border: `1px solid ${active ? 'var(--border-accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', cursor: 'pointer',
                      fontFamily: 'var(--font)', transition: 'all 0.15s',
                    }}
                  >
                    <input type="radio" checked={active} readOnly style={{ accentColor: 'var(--accent)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                        {m.display}
                        {downloaded && <span className="badge badge-success" style={{ marginLeft: 8, fontSize: 10 }}>Downloaded</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {skip ? (
            <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
              Skipped — you can pull models later from Settings.
            </div>
          ) : pull.status === 'idle' || pull.status === 'error' ? (
            <button className="btn btn-primary w-full" onClick={onPull} style={{ padding: '10px 0', fontSize: 14 }}>
              {pull.status === 'error' ? '🔄 Retry Pull' : modelAlreadyDownloaded ? '✅ Already Downloaded — Pull Anyway' : `⬇ Pull ${selectedModel}`}
            </button>
          ) : pull.status === 'pulling' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>Pulling {selectedModel}...</span>
                <span>{pull.percent}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${pull.percent}%` }} />
              </div>
            </div>
          ) : pull.status === 'done' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontSize: 13, fontWeight: 500, padding: 10 }}>
              ✅ {selectedModel} pulled successfully!
            </div>
          ) : null}

          {pull.status === 'error' && (
            <div style={{ color: 'var(--error)', fontSize: 12, marginTop: 8, padding: '8px 12px', background: 'var(--error-bg)', borderRadius: 'var(--radius)' }}>
              ❌ {pull.message}
            </div>
          )}
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', marginTop: 16 }}>
        <input type="checkbox" checked={skip} onChange={e => onSkip(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
        Skip — I'll pull models later in Settings
      </label>
    </div>
  );
}
