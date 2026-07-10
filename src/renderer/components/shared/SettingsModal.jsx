import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';

export default function SettingsModal({ onClose }) {
  const [tab, setTab] = useState('models');
  const [models, setModels] = useState(null);
  const [settings, setSettings] = useState(null);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [ollamaLoading, setOllamaLoading] = useState(false);
  const [ollamaError, setOllamaError] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [m, s] = await Promise.all([
      window.vaultmind.settings.getAvailableModels(),
      window.vaultmind.settings.get(),
    ]);
    setModels(m);
    setSettings(s);
  }

  async function fetchOllamaModels() {
    setOllamaLoading(true);
    setOllamaError(null);
    try {
      const list = await window.vaultmind.settings.listOllamaModels();
      setOllamaModels(list);
      if (list.length === 0) {
        setOllamaError('No models found. Open a terminal and run "ollama pull phi4".');
      } else {
        addToast('Connected to Ollama!', 'success');
      }
    } catch (e) {
      setOllamaError('Connection failed. Make sure Ollama is running (check system tray).');
    } finally {
      setOllamaLoading(false);
    }
  }

  async function handleSettingChange(key, value) {
    await window.vaultmind.settings.update(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  const TABS = [
    { id: 'models', label: '🤖 Models' },
    { id: 'generation', label: '⚙ Generation' },
    { id: 'retrieval', label: '🔍 Retrieval' },
  ];

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 640, maxHeight: '80vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div className="modal-title">⚙ Settings</div>
            <div className="modal-subtitle" style={{ marginBottom: 0 }}>Configure models and preferences</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '6px 14px', border: 'none', background: 'transparent',
              color: tab === t.id ? 'var(--accent-light)' : 'var(--text-secondary)',
              fontWeight: tab === t.id ? 600 : 400, fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--font)', borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1, transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Models Tab */}
        {tab === 'models' && settings && (
          <div>
            {/* Ollama section */}
            <div style={{ marginBottom: 28, padding: 18, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-strong)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🤖 Ollama Language Model</span>
                <span className="badge badge-accent">Default</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Ollama Server URL
                  </label>
                  <input
                    className="input"
                    value={settings.ollama_url || 'http://127.0.0.1:11434'}
                    onChange={e => handleSettingChange('ollama_url', e.target.value)}
                    placeholder="http://127.0.0.1:11434"
                  />
                </div>
                <button className="btn btn-secondary" onClick={fetchOllamaModels} disabled={ollamaLoading}>
                  {ollamaLoading ? 'Connecting...' : '🔄 Connect'}
                </button>
              </div>

              {ollamaError && (
                <div style={{ padding: '10px 12px', background: 'var(--error-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--error)', marginBottom: 14 }}>
                  ⚠️ {ollamaError}
                </div>
              )}

              {ollamaModels.length > 0 && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Select Active Model
                  </label>
                  <select
                    className="input"
                    value={settings.ollama_model || ''}
                    onChange={e => handleSettingChange('ollama_model', e.target.value)}
                  >
                    <option value="" disabled>-- Select an Ollama model --</option>
                    {ollamaModels.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                    All AI requests use Ollama. Run <code>ollama pull &lt;model&gt;</code> in terminal to add more models.
                  </div>
                </div>
              )}
            </div>


          </div>
        )}

        {/* Generation Tab */}
        {tab === 'generation' && settings && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SettingSlider
              label="Temperature"
              description="Lower = more factual (recommended for legal). Higher = more creative."
              value={parseFloat(settings.llm_temperature || 0.3)}
              min={0} max={1} step={0.1}
              onChange={v => handleSettingChange('llm_temperature', v)}
            />
            <SettingSlider
              label="Context Window"
              description="How much text the AI considers. Higher = more context but slower."
              value={parseInt(settings.llm_context_size || 4096)}
              min={2048} max={8192} step={1024}
              format={v => `${v.toLocaleString()} tokens`}
              onChange={v => handleSettingChange('llm_context_size', v)}
            />
          </div>
        )}

        {/* Retrieval Tab */}
        {tab === 'retrieval' && settings && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SettingSlider
              label="Retrieval Top-K"
              description="Number of source chunks retrieved per query. More = broader context but slower."
              value={parseInt(settings.retrieval_top_k || 5)}
              min={2} max={15} step={1}
              format={v => `${v} chunks`}
              onChange={v => handleSettingChange('retrieval_top_k', v)}
            />
            <SettingSlider
              label="Chunk Size"
              description="Text chunk size in characters. Smaller = more precise, larger = more context."
              value={parseInt(settings.chunk_size || 500)}
              min={200} max={1500} step={100}
              format={v => `${v} chars`}
              onChange={v => handleSettingChange('chunk_size', v)}
            />
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function SettingSlider({ label, description, value, min, max, step, format, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--accent-light)', fontWeight: 500 }}>
          {format ? format(value) : value}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>{description}</div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}
