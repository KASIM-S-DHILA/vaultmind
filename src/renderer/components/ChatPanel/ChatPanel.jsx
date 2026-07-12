import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import './ChatPanel.css';

export default function ChatPanel({
  messages, isStreaming, streamingContent, onSend, onStop, onClearHistory, onExportChat,
  onCitationClick, suggestedQuestions, modelLoading, modelLoadingMsg, ollamaStatus,
  webSearchEnabled, onWebSearchToggle,
  sessions, currentSessionId, onSessionSelect, onNewSession, onDeleteSession, onRenameSession,
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showSessions, setShowSessions] = useState(false);
  const [renamingSession, setRenamingSession] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  function handleSend() {
    if (!input.trim() || isStreaming) return;
    setShowSuggestions(false);
    onSend(input.trim());
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function useSuggestion(q) {
    setInput(q);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  const currentTitle = sessions.find(s => s.id === currentSessionId)?.title || 'Chat';
  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowSessions(v => !v)}
              title="Switch chat session"
              style={{ fontWeight: 600, fontSize: 14, gap: 4 }}
            >
              {currentTitle} ▾
            </button>
            {showSessions && (
              <div className="session-dropdown">
                {sessions.map(s => (
                  <div key={s.id} className="session-item">
                    {renamingSession === s.id ? (
                      <input
                        className="session-rename-input"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            onRenameSession(s.id, renameValue);
                            setRenamingSession(null);
                          }
                          if (e.key === 'Escape') setRenamingSession(null);
                        }}
                        onBlur={() => setRenamingSession(null)}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className={`session-item-name ${s.id === currentSessionId ? 'active' : ''}`}
                        onClick={() => { onSessionSelect(s.id); setShowSessions(false); }}
                      >
                        {s.title}
                      </span>
                    )}
                    <div className="session-item-actions">
                      <button
                        className="btn-icon"
                        title="Rename"
                        onClick={e => { e.stopPropagation(); setRenamingSession(s.id); setRenameValue(s.title); }}
                      >✎</button>
                      <button
                        className="btn-icon"
                        title="Delete"
                        onClick={e => { e.stopPropagation(); onDeleteSession(s.id); setShowSessions(false); }}
                      >✕</button>
                    </div>
                  </div>
                ))}
                <div className="session-divider" />
                <button className="session-new-btn" onClick={() => { onNewSession(); setShowSessions(false); }}>
                  + New Chat
                </button>
              </div>
            )}
          </div>
          <span
            className={`ollama-indicator ${ollamaStatus === 'ready' ? 'connected' : ollamaStatus === 'error' ? 'error' : 'connecting'}`}
            title={
              ollamaStatus === 'ready' ? 'Ollama connected' :
              ollamaStatus === 'error' ? 'Ollama error' :
              ollamaStatus === 'checking' ? 'Checking Ollama...' :
              'Starting Ollama...'
            }
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {messages.length > 0 && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={onExportChat} title="Export chat as Markdown">
                ↓ Export
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onClearHistory} title="Clear chat history">
                🗑 Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {isEmpty ? (
          <div className="chat-empty">
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Ask VaultMind</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, maxWidth: 360, textAlign: 'center' }}>
              Upload your documents and ask questions. Every answer cites its sources — you can always verify.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id || i}
                message={msg}
                onCitationClick={onCitationClick}
              />
            ))}
            {isStreaming && (
              <div className="animate-fade-in">
                <MessageBubble
                  message={{ role: 'assistant', content: streamingContent, citations: [] }}
                  isStreaming
                  onCitationClick={onCitationClick}
                />
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {showSuggestions && suggestedQuestions?.length > 0 && isEmpty && (
        <div className="chat-suggestions">
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
            Suggested Questions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {suggestedQuestions.slice(0, 4).map((q, i) => (
              <button
                key={i}
                className="suggestion-chip"
                onClick={() => useSuggestion(q)}
              >
                💡 {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Model loading bar */}
      {modelLoading && (
        <div className="model-loading-bar">
          <div className="model-loading-bar-inner" />
          {modelLoadingMsg && <div className="model-loading-msg">{modelLoadingMsg}</div>}
        </div>
      )}

      {/* Input area */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          <button
            className={`chat-web-btn ${webSearchEnabled ? 'active' : ''}`}
            onClick={onWebSearchToggle}
            title={webSearchEnabled ? 'Web search on — results will be included' : 'Web search off'}
          >
            🌐
          </button>
          <textarea
            ref={inputRef}
            className="chat-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your documents…"
            rows={1}
            disabled={isStreaming}
            style={{ resize: 'none' }}
          />
          {isStreaming ? (
            <button
              className="chat-stop-btn"
              onClick={onStop}
              title="Stop generating"
            >
              ■
            </button>
          ) : (
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              ↑
            </button>
          )}
        </div>
        <div className="chat-input-hint">
          Press Enter to send · Shift+Enter for new line · {webSearchEnabled ? '🌐 Web search enabled' : 'Answers grounded in your sources'}
        </div>
      </div>
    </div>
  );
}
