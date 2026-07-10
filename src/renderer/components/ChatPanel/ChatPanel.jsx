import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import './ChatPanel.css';

export default function ChatPanel({
  messages, isStreaming, streamingContent, onSend, onClearHistory,
  onCitationClick, suggestedQuestions, modelLoading,
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
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

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <span style={{ fontWeight: 600, fontSize: 14 }}>Chat</span>
        {messages.length > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClearHistory}
            title="Clear chat history"
          >
            🗑 Clear
          </button>
        )}
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
      {modelLoading && <div className="model-loading-bar"><div className="model-loading-bar-inner" /></div>}

      {/* Input area */}
      <div className="chat-input-area">
        <div className="chat-input-row">
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
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? <div className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : '↑'}
          </button>
        </div>
        <div className="chat-input-hint">
          Press Enter to send · Shift+Enter for new line · Answers are grounded in your sources
        </div>
      </div>
    </div>
  );
}
