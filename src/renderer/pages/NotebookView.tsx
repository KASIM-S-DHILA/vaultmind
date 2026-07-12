import React, { useState, useEffect, useRef } from 'react';
import SourcesPanel from '../components/SourcesPanel/SourcesPanel';
import ChatPanel from '../components/ChatPanel/ChatPanel';
import StudioPanel from '../components/StudioPanel/StudioPanel';
import SettingsModal from '../components/shared/SettingsModal';
import CollapseButton from '../components/shared/CollapseButton';
import TitleBar from '../components/TitleBar/TitleBar';
import StatusBar from '../components/StatusBar/StatusBar';

import { useSources } from '../hooks/useSources';
import { useChat } from '../hooks/useChat';
import { useNotebook } from '../hooks/useNotebook';
import { useSessions } from '../hooks/useSessions';
import type { Notebook } from '../../shared/types';

const SOURCES_WIDTH = 'var(--sources-width)';
const STUDIO_WIDTH = 'var(--studio-width)';

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
  const [modelLoadingMsg, setModelLoadingMsg] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState('checking');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const { sources, loading: sourcesLoading, uploadFiles, deleteSource, setSourceActive } = useSources(notebook.id);
  const { sessions, currentSessionId, setCurrentSessionId, createSession, deleteSession, renameSession } = useSessions(notebook.id);
  const { messages, isStreaming, streamingContent, sendMessage, stopGeneration, clearHistory, exportChat } = useChat(notebook.id, currentSessionId || undefined);
  const { guide, guideLoading, notes, saveNotes, refreshGuide } = useNotebook(notebook.id);

  const activeSourceIds = sources.filter(s => s.active !== 0).map(s => s.id);
  const handleSend = (text: string) => sendMessage(text, activeSourceIds, webSearchEnabled);

  function handleRefreshGuide() {
    refreshGuide(activeSourceIds.length > 0 ? activeSourceIds : undefined);
  }

  const prevActiveModel = useRef(activeModel);
  useEffect(() => {
    window.vaultmind.settings.get().then(s => {
      const m = s.ollama_model || 'gemma3:4b';
      setActiveModel(m);
      prevActiveModel.current = m;
    });
  }, []);

  async function handleModelChange(newModel: string) {
    if (newModel === prevActiveModel.current) return;
    setModelLoading(true);
    setModelLoadingMsg(`Loading ${newModel}...`);
    try {
      await window.vaultmind.ollama.warmupModel(newModel, (progress) => {
        setModelLoadingMsg(progress.message || `Loading ${newModel}...`);
      });
    } catch {}
    setModelLoading(false);
    setModelLoadingMsg('');
    await window.vaultmind.settings.update('ollama_model', newModel);
    setActiveModel(newModel);
    prevActiveModel.current = newModel;
  }

  useEffect(() => {
    const cleanup = window.vaultmind.onServerStatus?.((status: any) => {
      if (status.stage === 'ready') setOllamaStatus('ready');
      else if (status.stage === 'error') setOllamaStatus('error');
      else if (status.stage === 'starting') setOllamaStatus('starting');
    });

    window.vaultmind.ollama.getStatus().then((st: any) => {
      if (st.stage === 'ready') setOllamaStatus('ready');
      else if (st.stage === 'error') setOllamaStatus('error');
      else {
        window.vaultmind.ollama.checkRunning().then(running => {
          setOllamaStatus(running ? 'ready' : 'starting');
        });
      }
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
          width: sourcesCollapsed ? 0 : SOURCES_WIDTH,
          minWidth: sourcesCollapsed ? 0 : SOURCES_WIDTH,
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

        <CollapseButton
          collapsed={sourcesCollapsed}
          onToggle={() => setSourcesCollapsed(c => !c)}
          side="left"
          offset={SOURCES_WIDTH}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onSend={handleSend}
            onStop={stopGeneration}
            onClearHistory={clearHistory}
            onExportChat={exportChat}
            onCitationClick={setActiveCitation}
            suggestedQuestions={guide?.suggestedQuestions || []}
            modelLoading={modelLoading}
            modelLoadingMsg={modelLoadingMsg}
            ollamaStatus={ollamaStatus}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={() => setWebSearchEnabled(v => !v)}
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSessionSelect={setCurrentSessionId}
            onNewSession={createSession}
            onDeleteSession={deleteSession}
            onRenameSession={renameSession}
          />
        </div>

        <CollapseButton
          collapsed={studioCollapsed}
          onToggle={() => setStudioCollapsed(c => !c)}
          side="right"
          offset={STUDIO_WIDTH}
        />

        <div style={{
          width: studioCollapsed ? 0 : STUDIO_WIDTH,
          minWidth: studioCollapsed ? 0 : STUDIO_WIDTH,
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

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onModelChange={handleModelChange} ollamaStatus={ollamaStatus} onOllamaStatusChange={setOllamaStatus} />}
    </div>
  );
}
