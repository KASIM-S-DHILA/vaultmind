import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChat } from '../renderer/hooks/useChat';

const mockHistory = [
  { id: 'm1', notebook_id: 'nb1', role: 'user', content: 'hello', citations_json: null, created_at: 100 },
  { id: 'm2', notebook_id: 'nb1', role: 'assistant', content: 'hi there', citations_json: '[]', created_at: 200 },
];

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads history on mount', async () => {
    window.vaultmind.chat.getHistory = vi.fn().mockResolvedValue(mockHistory);

    const { result } = renderHook(() => useChat('nb1'));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });
    expect(result.current.messages[0].content).toBe('hello');
  });

  it('sends a message and appends user + assistant messages', async () => {
    window.vaultmind.chat.getHistory = vi.fn().mockResolvedValue([]);
    window.vaultmind.chat.send = vi.fn().mockImplementation((_nb, _msg, onToken) => {
      onToken('part1');
      onToken(' part2');
      return Promise.resolve({ id: 'resp1', content: 'part1 part2', citations: [] });
    });

    const { result } = renderHook(() => useChat('nb1'));

    await waitFor(() => expect(result.current.messages).toHaveLength(0));

    await act(async () => {
      await result.current.sendMessage('test message');
    });

    expect(window.vaultmind.chat.send).toHaveBeenCalled();
    expect(result.current.messages.length).toBeGreaterThanOrEqual(2);
    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg.role).toBe('assistant');
    expect(lastMsg.content).toBe('part1 part2');
  });

  it('sets error state on send failure', async () => {
    window.vaultmind.chat.getHistory = vi.fn().mockResolvedValue([]);
    window.vaultmind.chat.send = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChat('nb1'));

    await act(async () => {
      await result.current.sendMessage('test');
    });

    expect(result.current.messages[result.current.messages.length - 1].content).toBe('Network error');
  });

  it('stops generation', async () => {
    window.vaultmind.chat.stop = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useChat('nb1'));

    await act(async () => {
      await result.current.stopGeneration();
    });

    expect(window.vaultmind.chat.stop).toHaveBeenCalledWith('nb1');
    expect(result.current.isStreaming).toBe(false);
  });

  it('clears history and empties messages', async () => {
    window.vaultmind.chat.getHistory = vi.fn().mockResolvedValue(mockHistory);
    window.vaultmind.chat.clearHistory = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useChat('nb1'));

    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      await result.current.clearHistory();
    });

    expect(window.vaultmind.chat.clearHistory).toHaveBeenCalledWith('nb1', undefined);
    expect(result.current.messages).toHaveLength(0);
  });

  it('exports chat', async () => {
    window.vaultmind.chat.export = vi.fn().mockResolvedValue({ success: true, filePath: '/tmp/chat.md' });

    const { result } = renderHook(() => useChat('nb1'));

    let res: any;
    await act(async () => {
      res = await result.current.exportChat();
    });
    expect(res).toEqual({ success: true, filePath: '/tmp/chat.md' });
  });

  it('reloads history when notebookId changes', async () => {
    window.vaultmind.chat.getHistory = vi.fn().mockResolvedValue(mockHistory);

    const { result, rerender } = renderHook(({ id }) => useChat(id), {
      initialProps: { id: 'nb1' },
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    window.vaultmind.chat.getHistory = vi.fn().mockResolvedValue([]);
    rerender({ id: 'nb2' });

    await waitFor(() => expect(result.current.messages).toHaveLength(0));
  });
});
