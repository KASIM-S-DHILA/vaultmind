import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';

const SYSTEM_PROMPT_PRESETS = [
  {
    id: 'source-grounded',
    label: '🔍 Source-Grounded (Default)',
    desc: 'Cite sources with [1], [2] markers — factual, no speculation',
    prompt: `You are VaultMind, a private research assistant that answers based solely on the provided source documents. Your role is to analyze and synthesize information from those sources.

RULES:
1. Base your answer exclusively on the provided source documents — they are your single source of truth. Use your knowledge only to connect and synthesize what the sources contain.
2. Always cite your sources using inline markers like [1], [2], etc.
3. If the information is partially present in the sources, do your best to answer using what's available and note any gaps.
4. Be precise, factual, and professional.
5. When quoting or paraphrasing, indicate which source the information comes from.
6. Do not speculate or infer beyond what is explicitly stated in the documents.

CONTEXT:
{context}`,
  },
  {
    id: 'creative',
    label: '💡 Creative / Brainstorming',
    desc: 'Free-form — use sources as inspiration, not strict rules',
    prompt: `You are a creative thinking partner. Use the provided source documents as inspiration and reference material, but feel free to draw on your own knowledge to generate ideas, analogies, and creative connections.

RULES:
1. Use the sources as a starting point — build on them with your own knowledge.
2. When you reference something from a source, cite it with [1], [2], etc.
3. Be imaginative, suggestive, and exploratory in your responses.
4. It's okay to speculate or suggest possibilities beyond what's in the documents.

CONTEXT:
{context}`,
  },
  {
    id: 'concise',
    label: '📋 Concise / Bullet Points',
    desc: 'Short answers, bullet points, no fluff',
    prompt: `You are a precise, no-fluff assistant. Answer concisely using the provided source documents.

RULES:
1. Keep answers brief — prefer bullet points or numbered lists.
2. Cite sources with [1], [2] markers when referencing specific information.
3. Lead with the most important information first.
4. Omit introductory phrases like "Based on the sources..." — just answer directly.
5. If the sources don't contain the information, say so in one sentence.

CONTEXT:
{context}`,
  },
  {
    id: 'report',
    label: '📄 Professional Report',
    desc: 'Formal tone, structured sections, executive summary',
    prompt: `You are a professional research analyst preparing a formal report based on the provided source documents.

RULES:
1. Structure your response with clear sections: Summary, Key Findings, Details.
2. Use formal, professional language throughout.
3. Cite sources with [1], [2] markers for every key claim.
4. Include relevant data points, statistics, and quotes from the sources.
5. Conclude with a brief synthesis or recommendation if appropriate.

CONTEXT:
{context}`,
  },
  {
    id: 'qa',
    label: '❓ Direct Q&A',
    desc: 'Answer the question directly — no preamble, no postscript',
    prompt: `You are a direct question-answering system. Answer the user's question based on the provided source documents.

RULES:
1. Answer the question immediately — no greetings, no summaries.
2. Cite sources with [1], [2] markers inline.
3. If the answer is found in the sources, give it directly.
4. If the sources don't contain enough information, state what is known and what is missing.
5. Do not add extra context or commentary beyond what was asked.

CONTEXT:
{context}`,
  },
];

export default function SettingsModal({ onClose, onModelChange, ollamaStatus, onOllamaStatusChange }) {
  const [tab, setTab] = useState('models');
  const [models, setModels] = useState(null);
  const [settings, setSettings] = useState(null);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [ollamaLoading, setOllamaLoading] = useState(false);
  const [ollamaError, setOllamaError] = useState(null);
  const [serverStarting, setServerStarting] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadData();
    window.vaultmind.ollama.getAutoStart().then(setAutoStart);
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
        setOllamaError('No models found. Open a terminal and run "ollama pull gemma3:4b".');
      } else {
        addToast('Connected to Ollama!', 'success');
      }
    } catch (e) {
      setOllamaError('Connection failed. Make sure Ollama is running (check system tray).');
    } finally {
      setOllamaLoading(false);
    }
  }

  async function handleStartServer() {
    setServerStarting(true);
    setOllamaError(null);
    onOllamaStatusChange?.('starting');
    try {
      await window.vaultmind.ollama.startServer();
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const ok = await window.vaultmind.ollama.checkRunning();
        if (ok) {
          onOllamaStatusChange?.('ready');
          addToast('Ollama server is running', 'success');
          setServerStarting(false);
          return;
        }
      }
      onOllamaStatusChange?.('error');
      setOllamaError('Server did not start within 60 seconds.');
    } catch {
      onOllamaStatusChange?.('error');
      setOllamaError('Failed to start server.');
    }
    setServerStarting(false);
  }

  async function handleSettingChange(key, value) {
    await window.vaultmind.settings.update(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function handleAutoStartToggle(enabled) {
    const result = await window.vaultmind.ollama.setAutoStart(enabled);
    if (result.success) {
      setAutoStart(enabled);
      addToast(enabled ? 'Ollama will start automatically with Windows' : 'Ollama auto-start disabled', 'success');
    } else {
      addToast('Failed to set auto-start. Is Ollama installed?', 'error');
    }
  }

  const TABS = [
    { id: 'models', label: '🤖 Models' },
    { id: 'generation', label: '⚙ Generation' },
    { id: 'retrieval', label: '🔍 Retrieval' },
    { id: 'prompt', label: '📝 Prompt' },
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

              {/* Server status indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: ollamaStatus === 'ready' ? 'var(--success)' : ollamaStatus === 'error' ? 'var(--error)' : ollamaStatus === 'starting' ? 'var(--warning)' : 'var(--text-tertiary)',
                }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {ollamaStatus === 'ready' ? 'Connected' : ollamaStatus === 'error' ? 'Disconnected' : ollamaStatus === 'starting' ? 'Starting...' : 'Checking...'}
                </span>
                {(ollamaStatus === 'error' || ollamaStatus === 'starting') && (
                  <button className="btn btn-secondary btn-sm" onClick={handleStartServer} disabled={serverStarting} style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 10px' }}>
                    {serverStarting ? 'Starting...' : ollamaStatus === 'starting' ? 'Retry' : 'Start Server'}
                  </button>
                )}
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
                    onChange={e => {
                      handleSettingChange('ollama_model', e.target.value);
                      onModelChange?.(e.target.value);
                    }}
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

            {/* Auto-start toggle */}
            <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-strong)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>🚀 Start Ollama with Windows</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    Automatically starts Ollama server in the background when you log in
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={autoStart}
                    onChange={e => handleAutoStartToggle(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', inset: 0,
                    background: autoStart ? 'var(--accent)' : 'var(--bg-hover)',
                    borderRadius: 22, transition: 'all 0.2s',
                    border: '1px solid var(--border-strong)',
                  }}>
                    <span style={{
                      position: 'absolute', width: 16, height: 16, borderRadius: '50%',
                      background: 'white', top: 2,
                      left: autoStart ? 20 : 2,
                      transition: 'all 0.2s',
                    }} />
                  </span>
                </label>
              </div>
            </div>

          </div>
        )}

        {/* Generation Tab */}
        {tab === 'generation' && settings && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SettingSlider
              label="Temperature"
              description="Lower = more factual. Higher = more creative."
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

            <div style={{ padding: 18, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-strong)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>🌐 Web Search</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
                Web search uses Google Programmable Search. Get a free API key at{' '}
                <a href="#" onClick={e => { e.preventDefault(); window.vaultmind.openExternal('https://console.cloud.google.com/apis/credentials'); }} style={{ color: 'var(--accent-light)' }}>Google Cloud Console</a>
                {' '}and a Search Engine ID at{' '}
                <a href="#" onClick={e => { e.preventDefault(); window.vaultmind.openExternal('https://programmablesearchengine.google.com/'); }} style={{ color: 'var(--accent-light)' }}>Google CSE</a>.
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Google API Key
                </label>
                <input
                  className="input"
                  type="password"
                  value={settings.google_api_key || ''}
                  onChange={e => handleSettingChange('google_api_key', e.target.value)}
                  placeholder="AIzaSy..."
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Search Engine ID
                </label>
                <input
                  className="input"
                  value={settings.google_search_engine_id || ''}
                  onChange={e => handleSettingChange('google_search_engine_id', e.target.value)}
                  placeholder="cx=..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Prompt Tab */}
        {tab === 'prompt' && settings && (
          <div>
            <div style={{ marginBottom: 28, padding: 18, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-strong)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>📝 System Prompt</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                Instructions the AI follows for every answer. Must include <code>{'{context}'}</code> placeholder where source documents are inserted.
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>Presets</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {SYSTEM_PROMPT_PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSettingChange('system_prompt', p.prompt)}
                      style={{
                        textAlign: 'left', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                        background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: 12,
                        transition: 'all var(--transition-fast)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)'; }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="input"
                value={settings.system_prompt || ''}
                onChange={e => handleSettingChange('system_prompt', e.target.value)}
                style={{ width: '100%', minHeight: 280, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, resize: 'vertical' }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                Changes apply to the next question you ask.
              </div>
            </div>
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
