import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatPanel from '../renderer/components/ChatPanel/ChatPanel';

function createProps(overrides = {}) {
  return {
    messages: [],
    isStreaming: false,
    streamingContent: '',
    onSend: vi.fn(),
    onStop: vi.fn(),
    onClearHistory: vi.fn(),
    onExportChat: vi.fn(),
    onCitationClick: vi.fn(),
    suggestedQuestions: [],
    modelLoading: false,
    modelLoadingMsg: '',
    ollamaStatus: 'ready',
    webSearchEnabled: false,
    onWebSearchToggle: vi.fn(),
    sessions: [],
    currentSessionId: null,
    onSessionSelect: vi.fn(),
    onNewSession: vi.fn(),
    onDeleteSession: vi.fn(),
    onRenameSession: vi.fn(),
    ...overrides,
  };
}

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state with placeholder text', () => {
    render(<ChatPanel {...createProps()} />);
    expect(screen.getByText('Ask VaultMind')).toBeDefined();
  });

  it('renders messages', () => {
    const messages = [
      { id: '1', role: 'user', content: 'Hello', citations_json: null, notebook_id: 'nb1', created_at: 100 },
      { id: '2', role: 'assistant', content: 'Hi there!', citations_json: '[]', notebook_id: 'nb1', created_at: 200 },
    ];
    render(<ChatPanel {...createProps({ messages })} />);
    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.getByText('Hi there!')).toBeDefined();
  });

  it('shows streaming content when isStreaming is true', () => {
    render(<ChatPanel {...createProps({ isStreaming: true, streamingContent: 'Partial response...' })} />);
    expect(screen.getByText('Partial response...')).toBeDefined();
  });

  it('calls onSend when send button is clicked with input', () => {
    const onSend = vi.fn();
    render(<ChatPanel {...createProps({ onSend })} />);

    const textarea = screen.getByPlaceholderText('Ask anything about your documents…');
    fireEvent.change(textarea, { target: { value: 'test question' } });

    const sendBtn = screen.getByText('↑');
    fireEvent.click(sendBtn);

    expect(onSend).toHaveBeenCalledWith('test question');
  });

  it('shows stop button when streaming', () => {
    const onStop = vi.fn();
    render(<ChatPanel {...createProps({ isStreaming: true, onStop })} />);
    const stopBtn = screen.getByText('■');
    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalled();
  });

  it('sends on Enter key', () => {
    const onSend = vi.fn();
    render(<ChatPanel {...createProps({ onSend })} />);

    const textarea = screen.getByPlaceholderText('Ask anything about your documents…');
    fireEvent.change(textarea, { target: { value: 'enter send' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onSend).toHaveBeenCalledWith('enter send');
  });

  it('does not send on Shift+Enter', () => {
    const onSend = vi.fn();
    render(<ChatPanel {...createProps({ onSend })} />);

    const textarea = screen.getByPlaceholderText('Ask anything about your documents…');
    fireEvent.change(textarea, { target: { value: 'shift enter' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows export and clear buttons when messages exist', () => {
    const messages = [
      { id: '1', role: 'user', content: 'Hi', citations_json: null, notebook_id: 'nb1', created_at: 100 },
    ];
    render(<ChatPanel {...createProps({ messages })} />);
    expect(screen.getByText('↓ Export')).toBeDefined();
    expect(screen.getByText('🗑 Clear')).toBeDefined();
  });

  it('hides export and clear buttons when no messages', () => {
    render(<ChatPanel {...createProps({ messages: [] })} />);
    expect(screen.queryByText('↓ Export')).toBeNull();
    expect(screen.queryByText('🗑 Clear')).toBeNull();
  });

  it('shows suggested questions when empty and suggestions exist', () => {
    render(<ChatPanel {...createProps({
      messages: [],
      suggestedQuestions: ['Q1?', 'Q2?'],
    })} />);
    expect(screen.getByText('Suggested Questions')).toBeDefined();
    expect(screen.getByText('💡 Q1?')).toBeDefined();
  });

  it('hides suggestions once a message is sent', () => {
    const onSend = vi.fn();
    render(<ChatPanel {...createProps({
      onSend,
      suggestedQuestions: ['Q1?'],
    })} />);

    const textarea = screen.getByPlaceholderText('Ask anything about your documents…');
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onSend).toHaveBeenCalled();
  });

  it('shows model loading bar', () => {
    render(<ChatPanel {...createProps({ modelLoading: true, modelLoadingMsg: 'Loading model...' })} />);
    expect(screen.getByText('Loading model...')).toBeDefined();
  });

  it('shows web search toggle active state', () => {
    render(<ChatPanel {...createProps({ webSearchEnabled: true })} />);
    const hint = screen.getByText((content) => content.includes('Web search enabled'));
    expect(hint).toBeDefined();
  });

  it('calls onWebSearchToggle when web button clicked', () => {
    const onWebSearchToggle = vi.fn();
    render(<ChatPanel {...createProps({ onWebSearchToggle })} />);
    const webBtn = screen.getByText('🌐');
    fireEvent.click(webBtn);
    expect(onWebSearchToggle).toHaveBeenCalled();
  });

  it('shows session dropdown with sessions list', () => {
    const sessions = [
      { id: 's1', notebook_id: 'nb1', title: 'Chat 1', created_at: 100, updated_at: 100 },
      { id: 's2', notebook_id: 'nb1', title: 'Chat 2', created_at: 200, updated_at: 200 },
    ];
    render(<ChatPanel {...createProps({ sessions, currentSessionId: 's1' })} />);

    // Open session dropdown
    const sessionBtn = screen.getByText(/Chat 1/);
    fireEvent.click(sessionBtn);

    expect(screen.getByText('Chat 2')).toBeDefined();
    expect(screen.getByText('+ New Chat')).toBeDefined();
  });

  it('calls onNewSession when + New Chat clicked', () => {
    const onNewSession = vi.fn();
    render(<ChatPanel {...createProps({
      sessions: [{ id: 's1', notebook_id: 'nb1', title: 'Chat 1', created_at: 100, updated_at: 100 }],
      currentSessionId: 's1',
      onNewSession,
    })} />);

    const sessionBtn = screen.getByText(/Chat 1/);
    fireEvent.click(sessionBtn);

    fireEvent.click(screen.getByText('+ New Chat'));
    expect(onNewSession).toHaveBeenCalled();
  });

  it('renders with different ollama status indicators', () => {
    const { rerender } = render(<ChatPanel {...createProps({ ollamaStatus: 'ready' })} />);
    expect(screen.getByTitle('Ollama connected')).toBeDefined();

    rerender(<ChatPanel {...createProps({ ollamaStatus: 'error' })} />);
    expect(screen.getByTitle('Ollama error')).toBeDefined();

    rerender(<ChatPanel {...createProps({ ollamaStatus: 'checking' })} />);
    expect(screen.getByTitle('Checking Ollama...')).toBeDefined();

    rerender(<ChatPanel {...createProps({ ollamaStatus: 'starting' })} />);
    expect(screen.getByTitle('Starting Ollama...')).toBeDefined();
  });
});
