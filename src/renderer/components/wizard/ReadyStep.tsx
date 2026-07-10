import React from 'react';

export default function ReadyStep() {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>⚖️</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>VaultMind is Ready!</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
        Your private AI assistant is set up and ready to analyze confidential documents.
        Everything runs locally via Ollama — no data ever leaves your device.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: 'var(--text-tertiary)' }}>
        <span>✅ Ollama Connected</span>
        <span>✅ Fully Offline</span>
        <span>✅ Zero Telemetry</span>
      </div>
    </div>
  );
}
