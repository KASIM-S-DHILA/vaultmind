import React, { useState, useRef } from 'react';
import './SourcesPanel.css';

export default function UploadZone({ onUpload }) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).map(f => f.path).filter(Boolean);
    if (files.length) onUpload(files);
  };

  return (
    <button
      className={`upload-zone ${dragging ? 'drag-over' : ''}`}
      onClick={onUpload}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="upload-zone-icon">⬆</div>
      <div className="upload-zone-text">Add Sources</div>
      <div className="upload-zone-sub">PDF, TXT, MP3, WAV, M4A</div>
    </button>
  );
}
