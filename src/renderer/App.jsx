import React, { useState, useEffect } from 'react';
import SetupWizard from './pages/SetupWizard';
import NotebookList from './pages/NotebookList';
import NotebookView from './pages/NotebookView';
import Toast from './components/shared/Toast';
import { ToastProvider } from './hooks/useToast';

export default function App() {
  const [page, setPage] = useState('loading'); // 'loading' | 'setup' | 'home' | 'notebook'
  const [activeNotebook, setActiveNotebook] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const complete = await window.vaultmind.setup.isComplete();
        setPage(complete ? 'home' : 'setup');
      } catch {
        setPage('home');
      }
    }
    init();
  }, []);

  function openNotebook(notebook) {
    setActiveNotebook(notebook);
    setPage('notebook');
  }

  function goHome() {
    setActiveNotebook(null);
    setPage('home');
  }

  function onSetupComplete() {
    setPage('home');
  }

  if (page === 'loading') {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-app)' }}>
        <div className="flex flex-col items-center gap-4">
          <AppLogo size={48} />
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="h-full flex-col" style={{ display: 'flex', overflow: 'hidden' }}>
        {page === 'setup' && <SetupWizard onComplete={onSetupComplete} />}
        {page === 'home' && <NotebookList onOpenNotebook={openNotebook} />}
        {page === 'notebook' && activeNotebook && (
          <NotebookView notebook={activeNotebook} onBack={goHome} />
        )}
        <Toast />
      </div>
    </ToastProvider>
  );
}

function AppLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#logoGrad)" />
      <path d="M14 16C14 14.9 14.9 14 16 14H26L34 22V34C34 35.1 33.1 36 32 36H16C14.9 36 14 35.1 14 34V16Z"
        fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <path d="M26 14V22H34" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="27" r="3" fill="white" opacity="0.9" />
      <path d="M21 31.5L24 30L27 31.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#6d5dfc" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export { AppLogo };
