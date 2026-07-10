import React from 'react';

export default function WelcomeStep() {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Welcome to VaultMind</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
        VaultMind is a <strong style={{ color: 'var(--text-primary)' }}>fully private AI research assistant</strong> that
        answers questions based on your documents. Everything runs locally on your machine.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { icon: '🔒', title: '100% Offline', desc: 'Your documents never leave your device. No cloud, no telemetry.' },
          { icon: '📄', title: 'PDF, Text, Markdown & CSV', desc: 'Upload documents and get instant insights.' },
          { icon: '🎯', title: 'Source-Grounded Answers', desc: 'Every response cites its sources — you can verify everything.' },
          { icon: '🔄', title: 'Ollama-Powered AI', desc: 'Pull any Ollama model from Settings. Swap anytime.' },
        ].map(item => (
          <div key={item.title} style={{
            display: 'flex', gap: 14, padding: '12px 16px',
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 20, padding: '10px 14px', background: 'var(--warning-bg)',
        borderRadius: 'var(--radius)', border: '1px solid rgba(251,191,36,0.2)', fontSize: 12, color: 'var(--warning)',
      }}>
        ⚠️ Setup will pull ~2.5 GB of AI models via Ollama. Ensure you have a stable internet connection for the initial setup.
        After that, VaultMind works 100% offline.
      </div>
    </div>
  );
}
