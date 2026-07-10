import React, { useState, useEffect, useRef } from 'react';
import './StudioPanel.css';

export default function StudioPanel({ guide, guideLoading, notes, onSaveNotes, activeCitation, onQuestionClick }) {
  const [activeTab, setActiveTab] = useState('guide');
  const saveTimer = useRef(null);

  // Auto-switch to citation tab when a citation is clicked
  useEffect(() => {
    if (activeCitation) setActiveTab('citation');
  }, [activeCitation]);

  function handleNotesChange(e) {
    const val = e.target.value;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSaveNotes(val), 1000);
  }

  return (
    <div className="studio-panel">
      {/* Tabs */}
      <div className="studio-tabs">
        {[
          { id: 'guide', label: '📋 Guide' },
          { id: 'notes', label: '📝 Notes' },
          ...(activeCitation ? [{ id: 'citation', label: '🔍 Source' }] : []),
        ].map(tab => (
          <button
            key={tab.id}
            className={`studio-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="studio-content">
        {/* Notebook Guide Tab */}
        {activeTab === 'guide' && (
          <div className="animate-fade-in">
            {guideLoading ? (
              <div style={{ padding: 20 }}>
                <div className="skeleton" style={{ height: 16, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 16, width: '60%' }} />
              </div>
            ) : guide ? (
              <>
                {/* Overview */}
                {guide.overview && (
                  <div className="studio-section">
                    <div className="studio-section-title">Overview</div>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{guide.overview}</p>
                  </div>
                )}

                {/* Key Themes */}
                {guide.keyThemes?.length > 0 && (
                  <div className="studio-section">
                    <div className="studio-section-title">Key Themes</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {guide.keyThemes.map((theme, i) => (
                        <span key={i} className="badge badge-accent">{theme}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Questions */}
                {guide.suggestedQuestions?.length > 0 && (
                  <div className="studio-section">
                    <div className="studio-section-title">Suggested Questions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {guide.suggestedQuestions.map((q, i) => (
                        <button
                          key={i}
                          className="suggested-question"
                          onClick={() => onQuestionClick(q)}
                        >
                          <span style={{ color: 'var(--accent-light)', flexShrink: 0 }}>💡</span>
                          <span>{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="studio-empty">
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>Notebook Guide</div>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  Upload sources to generate an automatic overview, key themes, and suggested questions.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="studio-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="studio-section-title" style={{ margin: 0 }}>My Notes</div>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Auto-saved</span>
              </div>
              <textarea
                className="notes-editor"
                defaultValue={notes}
                onChange={handleNotesChange}
                placeholder="Take notes about your research…&#10;&#10;Notes are saved automatically per notebook."
              />
            </div>
          </div>
        )}

        {/* Citation Tab */}
        {activeTab === 'citation' && activeCitation && (
          <div className="animate-fade-in">
            <div className="studio-section">
              <div className="studio-section-title">Source Passage</div>
              <div style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius)', padding: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-light)' }}>
                    [{activeCitation.label}] {activeCitation.sourceTitle}
                  </span>
                  {activeCitation.page > 0 && (
                    <span className="badge badge-muted">Page {activeCitation.page}</span>
                  )}
                </div>
                <p style={{
                  fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)',
                  borderLeft: '2px solid var(--border-accent)', paddingLeft: 12,
                  fontStyle: 'italic',
                }}>
                  "{activeCitation.chunkText}"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
