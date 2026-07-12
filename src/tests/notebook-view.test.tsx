import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import NotebookView from '../renderer/pages/NotebookView';

const mockNotebook = { id: 'nb1', title: 'Test Notebook', created_at: 100 };

// Most child components are JSX so they just render; we mock the CSS import
// and let hooks use the pre-configured window.vaultmind mock.

describe('NotebookView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const onBack = vi.fn();
    render(<NotebookView notebook={mockNotebook as any} onBack={onBack} />);

    // TitleBar should render the notebook title
    await waitFor(() => {
      expect(screen.getByText('Test Notebook')).toBeDefined();
    });
  });

  it('renders the three-panel layout', async () => {
    render(<NotebookView notebook={mockNotebook as any} onBack={vi.fn()} />);

    // Wait for hooks to settle
    await waitFor(() => {
      expect(screen.getByText('Ask VaultMind')).toBeDefined();
    });
  });

  it('renders status bar with model info', async () => {
    // Mock settings to return a model
    window.vaultmind.settings.get = vi.fn().mockResolvedValue({ ollama_model: 'gemma3:4b' });
    window.vaultmind.ollama.getStatus = vi.fn().mockResolvedValue({ stage: 'ready' });

    render(<NotebookView notebook={mockNotebook as any} onBack={vi.fn()} />);

    // Wait for hooks to load and status to update
    await waitFor(() => {
      expect(screen.getByTitle('Ollama connected')).toBeDefined();
    });
  });
});
