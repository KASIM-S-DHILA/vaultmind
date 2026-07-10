import React, { useState, useEffect, useRef } from 'react';
import SourcesPanel from '../components/SourcesPanel/SourcesPanel';
import ChatPanel from '../components/ChatPanel/ChatPanel';
import StudioPanel from '../components/StudioPanel/StudioPanel';
import SettingsModal from '../components/shared/SettingsModal';
import TitleBar from '../components/TitleBar/TitleBar';
import StatusBar from '../components/StatusBar/StatusBar';
import OllamaOverlay from '../components/ChatPanel/OllamaOverlay';
import { useSources } from '../hooks/useSources';
import { useChat } from '../hooks/useChat';
import { useNotebook } from '../hooks/useNotebook';
import type { Notebook } from '../../shared/types';

interface NotebookViewProps {
  notebook: Notebook;
  onBack: () => void;
}

export default function NotebookView({ notebook, onBack }: NotebookViewProps) {
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [studioCollapsed, setStudioCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeCitation, setActiveCitation] = useState(null);
  const [title, setTitle] = useState(notebook.title);
  const [activeModel, setActiveModel] = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState('checking');

  const { sources, loading: sourcesLoading, uploadFiles, deleteSource, setSourceActive } = useSources(notebook.id);
  const { messages, isStreaming, streamingContent, sendMessage, clearHistory } = useChat(notebook.id);
  const { guide, guideLoading, notes, saveNotes, refreshGuide } = useNotebook(notebook.id);

  const activeSourceIds = sources.filter(s => s.active !== 0).map(s => s.id);
  const handleSend = (text: string) => sendMessage(text, activeSourceIds);

  function handleRefreshGuide() {
    refreshGuide(activeSourceIds.length > 0 ? activeSourceIds : undefined);
  }

  const prevShowSettings = useRef(showSettings);
  const prevActiveModel = useRef(activeModel);
  useEffect(() => {
    window.vaultmind.settings.get().then(s => {
      setActiveModel(s.ollama_model || 'phi4:latest');
    });
  }, []);

  useEffect(() => {
    if (prevShowSettings.current && !showSettings) {
      window.vaultmind.settings.get().then(async s => {
        const newModel = s.ollama_model || 'phi4:latest';
        if (newModel !== prevActiveModel.current) {
          setModelLoading(true);
          try {
            await window.vaultmind.ollama.warmupModel(newModel);
          } catch {}
          setModelLoading(false);
        }
        setActiveModel(newModel);
        prevActiveModel.current = newModel;
      });
    }
    prevShowSettings.current = showSettings;
  }, [showSettings]);

  useEffect(() => {
    const cleanup = window.vaultmind.onServerStatus?.((status: any) => {
      setOllamaStatus(status.stage === 'ready' ? 'ready' : status.stage === 'error' ? 'error' : 'starting');
    });
    return () => cleanup?.();
  }, []);

  async function handleRename(newTitle: string) {
    await window.vaultmind.notebooks.rename(notebook.id, newTitle);
    setTitle(newTitle);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
      <TitleBar title={title} onBack={onBack} onRename={handleRename} onOpenSettings={() => setShowSettings(true)} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
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
            onToggleActive={setSourceActive}
          />
        </div>

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

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onSend={handleSend}
            onClearHistory={clearHistory}
            onCitationClick={setActiveCitation}
            suggestedQuestions={guide?.suggestedQuestions || []}
            modelLoading={modelLoading}
            ollamaStatus={ollamaStatus}
          />
        </div>

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
            guide={guide as any}
            guideLoading={guideLoading}
            notes={notes}
            onSaveNotes={saveNotes}
            activeCitation={activeCitation}
            onQuestionClick={handleSend}
            onRefreshGuide={handleRefreshGuide}
          />
        </div>
      </div>

      <StatusBar sources={sources} isStreaming={isStreaming} ollamaStatus={ollamaStatus} activeModel={activeModel} />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <OllamaOverlay status={ollamaStatus} />
    </div>
  );
}
