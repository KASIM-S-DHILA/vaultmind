import React, { useState, useEffect } from 'react';
import { AppLogo } from '../App';
import WelcomeStep from '../components/wizard/WelcomeStep';
import SystemStep from '../components/wizard/SystemStep';
import OllamaStep from '../components/wizard/OllamaStep';
import ReadyStep from '../components/wizard/ReadyStep';

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'system', label: 'System Check' },
  { id: 'llm', label: 'Ollama Model' },
  { id: 'ready', label: 'Ready!' },
];

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [sysInfo, setSysInfo] = useState<Record<string, unknown> | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState({ installed: null as boolean | null, running: false, checking: true, version: '' });
  const [ollamaPull, setOllamaPull] = useState({ status: 'idle', percent: 0, message: '' });
  const [ollamaModels, setOllamaModels] = useState<Array<{ name: string }>>([]);
  const [selectedModel, setSelectedModel] = useState('phi4:latest');
  const [skipOllama, setSkipOllama] = useState(false);

  useEffect(() => {
    if (step === 1) {
      window.vaultmind.setup.getSystemInfo().then((info: unknown) => setSysInfo(info as Record<string, unknown>));
    }
    if (step === 2) {
      checkOllama();
    }
  }, [step]);

  async function checkOllama() {
    setOllamaStatus(s => ({ ...s, checking: true }));
    const inst = await window.vaultmind.ollama.checkInstalled();
    const running = inst.installed ? await window.vaultmind.ollama.checkRunning() : false;
    setOllamaStatus({ installed: inst.installed, version: inst.version || '', running, checking: false });
    if (running) {
      try {
        const models = await window.vaultmind.settings.listOllamaModels();
        setOllamaModels(models as Array<{ name: string }> || []);
      } catch { /* ignore */ }
    }
  }

  async function pullOllamaModel() {
    setOllamaPull({ status: 'pulling', percent: 0, message: `Pulling ${selectedModel}...` });
    try {
      await window.vaultmind.ollama.pullModel(selectedModel, (p: any) => {
        setOllamaPull({ status: 'pulling', percent: p.percent, message: p.message || `Pulling ${selectedModel}...` });
      });
      setOllamaPull({ status: 'done', percent: 100, message: `${selectedModel} ready!` });
      const models = await window.vaultmind.settings.listOllamaModels();
      setOllamaModels((models as Array<{ name: string }>) || []);
    } catch (e) {
      setOllamaPull({ status: 'error', percent: 0, message: (e as Error).message });
    }
  }

  async function finish() {
    await window.vaultmind.settings.update('ollama_model', selectedModel);
    await window.vaultmind.setup.complete();
    onComplete();
  }

  function canProceed() {
    if (step === 2) return ollamaPull.status === 'done' || skipOllama || (ollamaStatus.installed === false && !ollamaStatus.checking);
    return true;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
      <div className="title-bar" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)', flexShrink: 0 }}>
        <AppLogo size={24} />
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.3 }}>VaultMind Setup Wizard</span>
        <div className="title-bar-controls">
          <button className="window-btn" onClick={() => window.vaultmind.window.minimize()}>─</button>
          <button className="window-btn close" onClick={() => window.vaultmind.window.close()}>✕</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
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

        <div className="animate-fade-in-scale" style={{
          position: 'relative', zIndex: 1, width: 560, maxWidth: '90vw',
          background: 'var(--bg-panel)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)', padding: 40,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
            <AppLogo size={40} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>VaultMind</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Local AI for Legal &amp; Confidential Intelligence</div>
            </div>
          </div>

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

          <div className="animate-fade-in" key={step}>
            {step === 0 && <WelcomeStep />}
            {step === 1 && <SystemStep sysInfo={sysInfo} />}
            {step === 2 && (
              <OllamaStep
                status={ollamaStatus as any}
                pull={ollamaPull}
                onPull={pullOllamaModel}
                models={ollamaModels}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                onRefresh={checkOllama}
                skip={skipOllama}
                onSkip={setSkipOllama}
              />
            )}
            {step === 3 && <ReadyStep />}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
              ← Back
            </button>
            <button className="btn btn-primary" disabled={!canProceed()} onClick={() => step === 4 ? finish() : setStep(s => s + 1)}>
              {step === 4 ? '🚀 Launch VaultMind' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
