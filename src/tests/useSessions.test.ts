import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSessions } from '../renderer/hooks/useSessions';

const mockSessions = [
  { id: 's1', notebook_id: 'nb1', title: 'Chat 1', created_at: 100, updated_at: 100 },
  { id: 's2', notebook_id: 'nb1', title: 'Chat 2', created_at: 200, updated_at: 200 },
];

describe('useSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads sessions on mount and selects the first one', async () => {
    window.vaultmind.sessions.list = vi.fn().mockResolvedValue(mockSessions);

    const { result } = renderHook(() => useSessions('nb1'));

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2);
    });
    expect(result.current.currentSessionId).toBe('s1');
  });

  it('does not select session when list is empty', async () => {
    window.vaultmind.sessions.list = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useSessions('nb1'));

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(0);
    });
    expect(result.current.currentSessionId).toBeNull();
  });

  it('creates a new session and selects it', async () => {
    window.vaultmind.sessions.list = vi.fn().mockResolvedValue(mockSessions);
    window.vaultmind.sessions.create = vi.fn().mockResolvedValue({ id: 's3', notebook_id: 'nb1', title: 'New Chat', created_at: 300, updated_at: 300 });

    const { result } = renderHook(() => useSessions('nb1'));

    await waitFor(() => expect(result.current.sessions).toHaveLength(2));

    await act(async () => {
      await result.current.createSession();
    });

    expect(window.vaultmind.sessions.create).toHaveBeenCalledWith('nb1', 'New Chat');
    expect(result.current.currentSessionId).toBe('s3');
  });

  it('deletes a session and reloads', async () => {
    window.vaultmind.sessions.list = vi.fn().mockResolvedValue(mockSessions);
    window.vaultmind.sessions.delete = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useSessions('nb1'));

    await waitFor(() => expect(result.current.sessions).toHaveLength(2));

    await act(async () => {
      await result.current.deleteSession('s1');
    });

    expect(window.vaultmind.sessions.delete).toHaveBeenCalledWith('s1');
  });

  it('renames a session and reloads', async () => {
    window.vaultmind.sessions.list = vi.fn().mockResolvedValue(mockSessions);
    window.vaultmind.sessions.rename = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useSessions('nb1'));

    await waitFor(() => expect(result.current.sessions).toHaveLength(2));

    await act(async () => {
      await result.current.renameSession('s1', 'Renamed');
    });

    expect(window.vaultmind.sessions.rename).toHaveBeenCalledWith('s1', 'Renamed');
  });

  it('does not load when notebookId is empty', () => {
    renderHook(() => useSessions(''));
    expect(window.vaultmind.sessions.list).not.toHaveBeenCalled();
  });
});
