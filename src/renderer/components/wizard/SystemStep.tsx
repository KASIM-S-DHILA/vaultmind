import React from 'react';

interface SystemStepProps {
  sysInfo: Record<string, unknown> | null;
}

export default function SystemStep({ sysInfo }: SystemStepProps) {
  if (!sysInfo) {
    return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" style={{ margin: '0 auto' }} /></div>;
  }
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>System Check</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
        VaultMind has analyzed your system and selected the best settings.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <InfoRow icon="🖥️" label="CPU" value={`${(sysInfo.cpu as any)?.model?.slice(0, 40)} (${(sysInfo.cpu as any)?.cores} cores)`} />
        <InfoRow icon="💾" label="RAM"
          value={`${(sysInfo.ram as any)?.totalGB} GB total, ${(sysInfo.ram as any)?.freeGB} GB free`}
          status={(sysInfo.ram as any)?.totalGB >= 8 ? 'success' : 'warning'}
        />
        <InfoRow icon="Ⓜ️" label="Ollama"
          value={sysInfo.ollamaInstalled ? `Installed ${sysInfo.ollamaVersion || ''}` : 'Not found'}
          status={sysInfo.ollamaInstalled ? 'success' : 'warning'}
        />
        <InfoRow icon="🤖" label="Recommended" value={sysInfo.recommendedLLM as string} status="success" />
      </div>
          {(sysInfo.recommendedNote as string) && (
        <div style={{
          marginTop: 16, padding: '10px 14px', background: 'var(--info-bg)',
          borderRadius: 'var(--radius)', border: '1px solid rgba(96,165,250,0.2)', fontSize: 12, color: 'var(--info)',
        }}>
          ℹ️ {sysInfo.recommendedNote as string}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, status }: { icon: string; label: string; value: string; status?: string }) {
  const statusColor = status === 'success' ? 'var(--success)' : status === 'warning' ? 'var(--warning)' : 'var(--text-secondary)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius)', border: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 18, width: 24 }}>{icon}</span>
      <span style={{ color: 'var(--text-tertiary)', fontSize: 12, width: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: statusColor || 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
