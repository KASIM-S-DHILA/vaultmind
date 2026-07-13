import React from 'react';

interface OllamaOverlayProps {
  status: string;
  onRetry?: () => void;
}

export default function OllamaOverlay({ status, onRetry }: OllamaOverlayProps) {
  if (status !== 'starting' && status !== 'error') return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 500 }}>
      <div className="modal" style={{ width: 420, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {status === 'error' ? '⚠️' : '⚖'}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {status === 'error' ? 'Ollama Error' : 'Starting Ollama...'}
        </h2>

        {status === 'error' ? (
          <div style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            <p style={{ marginBottom: 8 }}>
              VaultMind needs Ollama (the AI engine) to be running, but it could not start or connect to it.
            </p>
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              <li style={{ marginBottom: 4 }}>Open the <strong>Settings</strong> panel and go to <strong>Models</strong></li>
              <li style={{ marginBottom: 4 }}>Check that Ollama is listed as connected — if not, click <strong>Start Ollama</strong></li>
              <li style={{ marginBottom: 4 }}>If it still fails, restart VaultMind and try again</li>
            </ol>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Please wait while the Ollama AI server starts up.
          </p>
        )}

        {status === 'starting' && (
          <div className="progress-bar">
            <div className="progress-bar-fill indeterminate" />
          </div>
        )}
        {status === 'error' && onRetry && (
          <button
            className="btn btn-primary"
            onClick={onRetry}
            style={{ marginTop: 8 }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
