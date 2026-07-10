import React, { useState, useEffect, useRef } from 'react';
import { AppLogo } from '../App';

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'system', label: 'System Check' },
  { id: 'llm', label: 'AI Model' },
  { id: 'whisper', label: 'Audio' },
  { id: 'ready', label: 'Ready!' },
];

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [sysInfo, setSysInfo] = useState(null);
  const [llmDownload, setLlmDownload] = useState({ status: 'idle', percent: 0, speed: 0 });
  const [whisperDownload, setWhisperDownload] = useState({ status: 'idle', percent: 0 });
  const [skipLLM, setSkipLLM] = useState(false);
  const [skipAudio, setSkipAudio] = useState(false);

  useEffect(() => {
    if (step === 1) {
      window.vaultmind.setup.getSystemInfo().then(setSysInfo);
    }
  }, [step]);

  async function downloadLLM() {
    setLlmDownload({ status: 'downloading', percent: 0 });
    try {
      await window.vaultmind.setup.downloadModel('llm', (p) => {
        setLlmDownload({ status: 'downloading', percent: p.percent, downloaded: p.downloaded, total: p.total });
      });
      setLlmDownload({ status: 'done', percent: 100 });
    } catch (e) {
      setLlmDownload({ status: 'error', error: e.message, percent: 0 });
    }
  }

  async function downloadWhisper() {
    setWhisperDownload({ status: 'downloading', percent: 0 });
    try {
      await window.vaultmind.setup.downloadModel('whisper', (p) => {
        setWhisperDownload({ status: 'downloading', percent: p.percent });
      });
      setWhisperDownload({ status: 'done', percent: 100 });
    } catch (e) {
      setWhisperDownload({ status: 'error', error: e.message, percent: 0 });
    }
  }

  async function finish() {
    await window.vaultmind.setup.complete();
    onComplete();
  }

  const canProceed = () => {
    if (step === 2) return llmDownload.status === 'done' || skipLLM;
    if (step === 3) return whisperDownload.status === 'done' || skipAudio;
    return true;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-app)',
    }}>
      {/* Title bar */}
      <div className="title-bar" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)', flexShrink: 0 }}>
        <AppLogo size={24} />
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.3 }}>VaultMind Setup Wizard</span>
        <div className="title-bar-controls">
          <button className="window-btn" onClick={() => window.vaultmind.window.minimize()}>─</button>
          <button className="window-btn close" onClick={() => window.vaultmind.window.close()}>✕</button>
        </div>
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated background orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute', width: 400, height: 400, borderRadius: '50%',
              background: `radial-gradient(circle, rgba(109,93,252,${0.06 - i * 0.015}) 0%, transparent 70%)`,
              top: `${20 + i * 30}%`, left: `${10 + i * 30}%`,
              transform: 'translate(-50%,-50%)',
              animation: `pulse ${3 + i}s ease infinite`,
              animationDelay: `${i * 0.8}s`,
            }} />
          ))}
        </div>

        {/* Wizard card */}
        <div className="animate-fade-in-scale" style={{
          position: 'relative', zIndex: 1, width: 560, maxWidth: '90vw',
          background: 'var(--bg-panel)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)', padding: 40,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px var(--border)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
            <AppLogo size={40} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>VaultMind</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Local AI for Legal &amp; Confidential Intelligence</div>
            </div>
          </div>

          {/* Step progress */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                <div style={{
                  height: 3, width: '100%', borderRadius: 2,
                  background: i <= step ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
                  transition: 'background 0.4s ease',
                }} />
                <span style={{ fontSize: 10, color: i <= step ? 'var(--text-secondary)' : 'var(--text-tertiary)', fontWeight: 500 }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="animate-fade-in" key={step}>
            {step === 0 && <WelcomeStep />}
            {step === 1 && <SystemStep sysInfo={sysInfo} />}
            {step === 2 && (
              <LLMStep
                download={llmDownload}
                onDownload={downloadLLM}
                sysInfo={sysInfo}
                skip={skipLLM}
                onSkip={setSkipLLM}
              />
            )}
            {step === 3 && <AudioStep download={whisperDownload} onDownload={downloadWhisper} skip={skipAudio} onSkip={setSkipAudio} />}
            {step === 4 && <ReadyStep />}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setStep(s => s - 1)}
              style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
            >
              ← Back
            </button>
            <button
              className="btn btn-primary"
              disabled={!canProceed()}
              onClick={() => step === 4 ? finish() : setStep(s => s + 1)}
            >
              {step === 4 ? '🚀 Launch VaultMind' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Welcome to VaultMind</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
        VaultMind is a <strong style={{ color: 'var(--text-primary)' }}>fully private AI research assistant</strong> for
        legal teams and professionals handling confidential documents.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { icon: '🔒', title: '100% Offline', desc: 'Your documents never leave your device. No cloud, no telemetry.' },
          { icon: '📄', title: 'PDF, Text & Audio', desc: 'Upload contracts, meeting recordings, and notes.' },
          { icon: '⚖️', title: 'Legal-Grade AI', desc: 'Source-grounded answers with inline citations.' },
          { icon: '🔄', title: 'Swappable Models', desc: 'Choose and change your AI model anytime in Settings.' },
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
        ⚠️ Setup will download ~2.5 GB of AI models. Ensure you have a stable internet connection for the initial setup.
        After that, VaultMind works 100% offline.
      </div>
    </div>
  );
}

function SystemStep({ sysInfo }) {
  if (!sysInfo) return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" style={{ margin: '0 auto' }} /></div>;
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>System Check</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
        VaultMind has analyzed your system and selected the best settings.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <InfoRow icon="🖥️" label="CPU" value={`${sysInfo.cpu.model.slice(0, 40)} (${sysInfo.cpu.cores} cores)`} />
        <InfoRow icon="💾" label="RAM"
          value={`${sysInfo.ram.totalGB} GB total, ${sysInfo.ram.freeGB} GB free`}
          status={sysInfo.ram.totalGB >= 8 ? 'success' : 'warning'}
        />
        <InfoRow icon="🎮" label="GPU" value={sysInfo.gpu.detected ? 'Detected (will accelerate LLM)' : 'None (CPU mode)'} />
        <InfoRow icon="🤖" label="Recommended Model" value={sysInfo.recommendedLLM.replace('.gguf', '')} status="success" />
      </div>
      {sysInfo.recommendedNote && (
        <div style={{
          marginTop: 16, padding: '10px 14px', background: 'var(--info-bg)',
          borderRadius: 'var(--radius)', border: '1px solid rgba(96,165,250,0.2)', fontSize: 12, color: 'var(--info)',
        }}>
          ℹ️ {sysInfo.recommendedNote}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, status }) {
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

function LLMStep({ download, onDownload, sysInfo, skip, onSkip }) {
  const formatBytes = (b) => b ? `${(b / (1024 ** 3)).toFixed(2)} GB` : '';
  const folderPath = sysInfo ? `${sysInfo.dataDir}\\models\\llm` : 'your userData folder\\models\\llm';

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Download AI Model</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
        The AI model runs entirely on your device. This is a one-time download.
      </p>

      <div style={{
        padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-accent)', marginBottom: 20,
        opacity: skip ? 0.4 : 1, transition: 'opacity 0.2s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Phi-4 Mini (Recommended)</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Microsoft • 3.8B parameters • Q4_K_M quantization</div>
          </div>
          <span className="badge badge-accent">Best for {sysInfo?.ram?.totalGB}GB RAM</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Download size: ~2.3 GB • RAM usage: ~3 GB • Excellent reasoning and legal analysis
        </div>

        {!skip && download.status === 'idle' && (
          <button className="btn btn-primary w-full" onClick={onDownload}>
            ⬇ Download Model
          </button>
        )}

        {!skip && download.status === 'downloading' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>Downloading... {download.percent}%</span>
              <span>{formatBytes(download.downloaded)} / {formatBytes(download.total)}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${download.percent}%` }} />
            </div>
          </div>
        )}

        {!skip && download.status === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontSize: 13, fontWeight: 500 }}>
            ✅ Model downloaded successfully!
          </div>
        )}

        {!skip && download.status === 'error' && (
          <div>
            <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 8 }}>❌ {download.error}</div>
            <button className="btn btn-secondary" onClick={onDownload}>Retry</button>
          </div>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={skip}
          onChange={e => onSkip(e.target.checked)}
          style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
        />
        Skip download (I have my own GGUF models)
      </label>

      {skip && (
        <div className="selectable font-normal" style={{
          padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border-strong)', fontSize: 12, color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}>
          💡 Place your GGUF model files in:
          <div style={{
            fontFamily: 'var(--font-mono)', color: 'var(--accent-light)',
            marginTop: 6, padding: '6px 10px', background: 'var(--bg-app)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            wordBreak: 'break-all',
          }}>
            {folderPath}
          </div>
          <div style={{ marginTop: 6 }}>
            You can select your custom model in Settings (⚙) once setup is complete.
          </div>
        </div>
      )}

      {!skip && (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          You can change or add more AI models anytime from Settings → Model Manager after setup.
        </p>
      )}
    </div>
  );
}

function AudioStep({ download, onDownload, skip, onSkip }) {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Audio Transcription</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
        Enable audio support to transcribe meeting recordings and audio files.
      </p>

      <div style={{
        padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)', marginBottom: 16, opacity: skip ? 0.4 : 1,
        transition: 'opacity 0.2s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Whisper Base Model</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>OpenAI Whisper.cpp • Local transcription</div>
          </div>
          <span className="badge badge-success">~140 MB</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Transcribes MP3, WAV, M4A, and more. Fast CPU transcription with voice activity detection.
        </div>

        {!skip && download.status === 'idle' && (
          <button className="btn btn-secondary w-full" onClick={onDownload}>⬇ Download Whisper</button>
        )}
        {!skip && download.status === 'downloading' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Downloading... {download.percent}%</div>
            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${download.percent}%` }} /></div>
          </div>
        )}
        {!skip && download.status === 'done' && (
          <div style={{ color: 'var(--success)', fontSize: 13, fontWeight: 500 }}>✅ Whisper downloaded!</div>
        )}
        {!skip && download.status === 'error' && (
          <div>
            <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 8 }}>❌ {download.error}</div>
            <button className="btn btn-secondary" onClick={onDownload}>Retry</button>
          </div>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
        <input
          type="checkbox"
          checked={skip}
          onChange={e => onSkip(e.target.checked)}
          style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
        />
        Skip audio support for now (you can enable it later in Settings)
      </label>
    </div>
  );
}

function ReadyStep() {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>⚖️</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>VaultMind is Ready!</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
        Your private AI assistant is set up and ready to analyze confidential documents.
        Everything runs locally — no internet needed from here on.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: 'var(--text-tertiary)' }}>
        <span>✅ AI Model Ready</span>
        <span>✅ Fully Offline</span>
        <span>✅ Zero Telemetry</span>
      </div>
    </div>
  );
}
