import React, { useState } from 'react';
import { AppLogo } from '../App';
import SourcesPanel from '../components/SourcesPanel/SourcesPanel';
import ChatPanel from '../components/ChatPanel/ChatPanel';
import StudioPanel from '../components/StudioPanel/StudioPanel';
import SettingsModal from '../components/shared/SettingsModal';
import { useSources } from '../hooks/useSources';
import { useChat } from '../hooks/useChat';
import { useNotebook } from '../hooks/useNotebook';

export default function NotebookView({ notebook, onBack }) {
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [studioCollapsed, setStudioCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeCitation, setActiveCitation] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const { sources, loading: sourcesLoading, uploadFiles, deleteSource } = useSources(notebook.id);
  const { messages, isStreaming, streamingContent, sendMessage, clearHistory } = useChat(notebook.id);
  const { guide, guideLoading, notes, saveNotes, refreshGuide } = useNotebook(notebook.id);

  // Refresh guide when sources change
  const onSourceReady = () => refreshGuide();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
      {/* Title Bar */}
      <div className="title-bar" style={{
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        padding: '0 12px 0 16px',
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          ← Notebooks
        </button>

        <div className="divider-vertical" style={{ height: 16, margin: '0 8px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📁</span>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.3 }}>{notebook.title}</span>
        </div>

        <span className="badge badge-accent" style={{ marginLeft: 8, fontSize: 10 }}>🔒 Offline</span>

        <div className="title-bar-controls">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSettings(true)}
            style={{ fontSize: 12, WebkitAppRegion: 'no-drag' }}
          >
            ⚙ Settings
          </button>
          <div className="divider-vertical" style={{ height: 16, margin: '0 4px' }} />
          <button className="window-btn" onClick={() => window.vaultmind.window.minimize()}>─</button>
          <button className="window-btn" onClick={() => window.vaultmind.window.maximize()}>□</button>
          <button className="window-btn close" onClick={() => window.vaultmind.window.close()}>✕</button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Sources Panel (Left) */}
        <div style={{
          width: sourcesCollapsed ? 0 : 'var(--sources-width)',
          minWidth: sourcesCollapsed ? 0 : 'var(--sources-width)',
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-panel)',
        }}>
          <SourcesPanel
            sources={sources}
            loading={sourcesLoading}
            onUpload={uploadFiles}
            onDelete={deleteSource}
            onSourceReady={onSourceReady}
          />
        </div>

        {/* Toggle left panel */}
        <button
          onClick={() => setSourcesCollapsed(c => !c)}
          style={{
            position: 'absolute', left: sourcesCollapsed ? 0 : 'var(--sources-width)',
            top: '50%', transform: 'translateY(-50%)',
            width: 18, height: 48, zIndex: 10,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            cursor: 'pointer', color: 'var(--text-tertiary)',
            fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'left 0.25s ease',
          }}
        >
          {sourcesCollapsed ? '›' : '‹'}
        </button>

        {/* Chat Panel (Center) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onSend={sendMessage}
            onClearHistory={clearHistory}
            onCitationClick={setActiveCitation}
            suggestedQuestions={guide?.suggestedQuestions || []}
          />
        </div>

        {/* Toggle right panel */}
        <button
          onClick={() => setStudioCollapsed(c => !c)}
          style={{
            position: 'absolute',
            right: studioCollapsed ? 0 : 'var(--studio-width)',
            top: '50%', transform: 'translateY(-50%)',
            width: 18, height: 48, zIndex: 10,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
            cursor: 'pointer', color: 'var(--text-tertiary)',
            fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'right 0.25s ease',
          }}
        >
          {studioCollapsed ? '‹' : '›'}
        </button>

        {/* Studio Panel (Right) */}
        <div style={{
          width: studioCollapsed ? 0 : 'var(--studio-width)',
          minWidth: studioCollapsed ? 0 : 'var(--studio-width)',
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-panel)',
        }}>
          <StudioPanel
            guide={guide}
            guideLoading={guideLoading}
            notes={notes}
            onSaveNotes={saveNotes}
            activeCitation={activeCitation}
            onQuestionClick={sendMessage}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        height: 'var(--statusbar-height)',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-panel)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 16,
        fontSize: 11, color: 'var(--text-tertiary)',
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--success)', fontWeight: 500 }}>● Offline</span>
        <span>Sources: {sources.filter(s => s.status === 'ready').length}</span>
        <span>Chunks: {sources.reduce((a, s) => a + (s.chunk_count || 0), 0)}</span>
        {isStreaming && <span style={{ color: 'var(--accent-light)', animation: 'pulse 1s infinite' }}>● Generating...</span>}
        <div style={{ marginLeft: 'auto' }}>
          <span>Model: Phi-4 Mini</span>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
