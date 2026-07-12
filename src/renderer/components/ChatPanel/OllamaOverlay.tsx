import React from 'react';

interface OllamaOverlayProps {
  status: string;
  onRetry?: () => void;
}

export default function OllamaOverlay({ status, onRetry }: OllamaOverlayProps) {
  if (status !== 'starting' && status !== 'error') return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 500 }}>
      <div className="modal" style={{ width: 400, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {status === 'error' ? '⚠️' : '⚖'}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {status === 'error' ? 'Ollama Error' : 'Starting Ollama...'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          {status === 'error'
            ? 'Ollama failed to start or is not responding. Please check that Ollama is installed.'
            : 'Please wait while the Ollama AI server starts up.'}
        </p>
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
