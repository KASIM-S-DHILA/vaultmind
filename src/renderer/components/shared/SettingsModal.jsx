import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';

export default function SettingsModal({ onClose }) {
  const [tab, setTab] = useState('models');
  const [models, setModels] = useState(null);
  const [settings, setSettings] = useState(null);
  const [downloading, setDownloading] = useState({});
  const [customUrl, setCustomUrl] = useState('');
  const [customType, setCustomType] = useState('llm');
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

    if (s.llm_provider === 'ollama') {
      try {
        const list = await window.vaultmind.settings.listOllamaModels();
        setOllamaModels(list);
      } catch (_) {}
    }
  }

  async function fetchOllamaModels() {
    setOllamaLoading(true);
    setOllamaError(null);
    try {
      const list = await window.vaultmind.settings.listOllamaModels();
      setOllamaModels(list);
      if (list.length === 0) {
        setOllamaError('No models found. Run "ollama pull phi4" or similar in terminal.');
      } else {
        addToast('Connected to Ollama!', 'success');
      }
    } catch (e) {
      setOllamaError('Connection failed. Make sure Ollama server is running.');
    } finally {
      setOllamaLoading(false);
    }
  }

  async function handleSetActive(type, name) {
    await window.vaultmind.settings.setActiveModel(type, name);
    await loadData();
    addToast(`Switched to ${name}`, 'success');
  }

  async function handleDelete(type, name) {
    const result = await window.vaultmind.settings.deleteModel(type, name);
    if (result.success) {
      await loadData();
      addToast(`Deleted ${name}`, 'info');
    } else {
      addToast(result.error, 'error');
    }
  }

  async function handleDownload(type, model) {
    setDownloading(prev => ({ ...prev, [model.name]: { percent: 0, status: 'downloading' } }));
    try {
      await window.vaultmind.settings.downloadModel(model.url, type, (p) => {
        setDownloading(prev => ({ ...prev, [model.name]: { percent: p.percent, status: 'downloading' } }));
      });
      setDownloading(prev => ({ ...prev, [model.name]: { percent: 100, status: 'done' } }));
      await loadData();
      addToast(`${model.displayName} downloaded!`, 'success');
    } catch (e) {
      setDownloading(prev => ({ ...prev, [model.name]: { status: 'error', error: e.message } }));
      addToast(`Download failed: ${e.message}`, 'error');
    }
  }

  async function handleCustomDownload() {
    if (!customUrl.trim()) return;
    const name = customUrl.split('/').pop().split('?')[0];
    const fakeModel = { url: customUrl.trim(), name, displayName: name };
    setCustomUrl('');
    await handleDownload(customType, fakeModel);
  }

  async function handleSettingChange(key, value) {
    await window.vaultmind.settings.update(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'llm_provider' && value === 'ollama') {
      setTimeout(fetchOllamaModels, 50);
    }
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
            {/* LLM Provider Selection */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                🤖 Language Model (LLM) Provider
              </div>
              <div style={{ display: 'flex', gap: 8, background: 'var(--bg-elevated)', padding: 4, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => handleSettingChange('llm_provider', 'local')}
                  style={{
                    flex: 1, padding: '8px 12px', border: 'none', borderRadius: 'var(--radius-sm)',
                    background: (settings.llm_provider || 'local') === 'local' ? 'var(--bg-active)' : 'transparent',
                    color: (settings.llm_provider || 'local') === 'local' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: (settings.llm_provider || 'local') === 'local' ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, transition: 'all 0.15s',
                  }}
                >
                  Local GGUF (node-llama-cpp)
                </button>
                <button
                  onClick={() => handleSettingChange('llm_provider', 'ollama')}
                  style={{
                    flex: 1, padding: '8px 12px', border: 'none', borderRadius: 'var(--radius-sm)',
                    background: settings.llm_provider === 'ollama' ? 'var(--bg-active)' : 'transparent',
                    color: settings.llm_provider === 'ollama' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: settings.llm_provider === 'ollama' ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, transition: 'all 0.15s',
                  }}
                >
                  Ollama Server
                </button>
              </div>
            </div>

            {/* Local LLM list */}
            {(settings.llm_provider || 'local') === 'local' && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Downloaded Local Models
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {(models?.llm || []).map(model => {
                    const dl = downloading[model.name];
                    return (
                      <div key={model.name} style={{
                        padding: '12px 14px', background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius)', border: `1px solid model.active ? 'var(--border-accent)' : 'var(--border)'`,
                        transition: 'border-color 0.15s',
                        borderColor: model.active ? 'var(--border-accent)' : 'var(--border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{model.displayName || model.name}</span>
                              {model.recommended && <span className="badge badge-gold">Recommended</span>}
                              {model.active && <span className="badge badge-accent">Active</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                              {model.size}{model.ram ? ` · RAM: ${model.ram}` : ''}
                              {model.description ? ` · ${model.description}` : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                            {model.downloaded ? (
                              <>
                                {!model.active && (
                                  <button className="btn btn-secondary btn-sm" onClick={() => handleSetActive('llm', model.name)}>
                                    Use This
                                  </button>
                                )}
                                {!model.active && (
                                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete('llm', model.name)} style={{ color: 'var(--error)' }}>
                                    🗑
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleDownload('llm', model)}
                                  disabled={dl?.status === 'downloading'}
                              >
                                {dl?.status === 'downloading' ? `${dl.percent}%` : '⬇ Download'}
                              </button>
                            )}
                          </div>
                        </div>
                        {dl?.status === 'downloading' && (
                          <div className="progress-bar" style={{ marginTop: 6 }}>
                            <div className="progress-bar-fill" style={{ width: `${dl.percent}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Custom model GGUF URL */}
                <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 24 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>📦 Add Custom GGUF Model</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                    Paste any Hugging Face GGUF model URL to download it.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      value={customUrl}
                      onChange={e => setCustomUrl(e.target.value)}
                      placeholder="https://huggingface.co/…/model.gguf"
                      style={{ fontSize: 12 }}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleCustomDownload}
                      disabled={!customUrl.trim()}
                    >
                      ⬇ Download
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ollama selection */}
            {settings.llm_provider === 'ollama' && (
              <div style={{ marginBottom: 28, padding: 18, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-strong)' }}>
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
                      Selected model will be queried via Ollama's local chat API.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Whisper section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
                🎙️ Audio Transcription (Whisper)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(models?.whisper || []).map(model => {
                  const dl = downloading[model.name];
                  return (
                    <div key={model.name} style={{
                      padding: '12px 14px', background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius)', border: `1px solid ${model.active ? 'var(--border-accent)' : 'var(--border)'}`,
                      transition: 'border-color 0.15s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{model.displayName || model.name}</span>
                            {model.recommended && <span className="badge badge-gold">Recommended</span>}
                            {model.active && <span className="badge badge-accent">Active</span>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {model.size}{model.description ? ` · ${model.description}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                          {model.downloaded ? (
                            <>
                              {!model.active && (
                                <button className="btn btn-secondary btn-sm" onClick={() => handleSetActive('whisper', model.name)}>
                                  Use This
                                </button>
                              )}
                              {!model.active && (
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete('whisper', model.name)} style={{ color: 'var(--error)' }}>
                                  🗑
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleDownload('whisper', model)}
                              disabled={dl?.status === 'downloading'}
                            >
                              {dl?.status === 'downloading' ? `${dl.percent}%` : '⬇ Download'}
                            </button>
                          )}
                        </div>
                      </div>
                      {dl?.status === 'downloading' && (
                        <div className="progress-bar" style={{ marginTop: 6 }}>
                          <div className="progress-bar-fill" style={{ width: `${dl.percent}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
            <SettingSlider
              label="GPU Layers"
              description="Number of model layers to offload to GPU. 0 = CPU only. Increase if you have NVIDIA GPU."
              value={parseInt(settings.gpu_layers || 0)}
              min={0} max={100} step={10}
              format={v => v === 0 ? 'CPU Only' : `${v} layers`}
              onChange={v => handleSettingChange('gpu_layers', v)}
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
