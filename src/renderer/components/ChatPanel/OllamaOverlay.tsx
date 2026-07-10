import React from 'react';

interface OllamaOverlayProps {
  status: string;
}

export default function OllamaOverlay({ status }: OllamaOverlayProps) {
  if (status === 'ready') return null;

  const isError = status === 'error';
  const isChecking = status === 'checking';

  return (
    <div className="modal-backdrop" style={{ zIndex: 500 }}>
      <div className="modal" style={{ width: 400, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {isError ? '⚠️' : '⚖'}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {isError ? 'Ollama Error' : isChecking ? 'Checking Ollama...' : 'Starting Ollama...'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          {isError
            ? 'Ollama failed to start. Please check that Ollama is installed and try again.'
            : isChecking
              ? 'Checking if Ollama server is running...'
              : 'Please wait while the Ollama AI server starts up.'}
        </p>
        {!isError && (
          <div className="progress-bar">
            <div className="progress-bar-fill indeterminate" />
          </div>
        )}
        {isError && (
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
            You can still browse notebooks and sources.
          </p>
        )}
      </div>
    </div>
  );
}
