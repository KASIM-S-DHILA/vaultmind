import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotebook } from '../renderer/hooks/useNotebook';

const mockGuide = { overview: 'Test overview', keyThemes: ['theme1'], suggestedQuestions: ['Q1?'] };

describe('useNotebook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads guide and notes on mount', async () => {
    window.vaultmind.notebooks.getGuide = vi.fn().mockResolvedValue(mockGuide);
    window.vaultmind.notes.get = vi.fn().mockResolvedValue({ content: 'my notes' });

    const { result } = renderHook(() => useNotebook('nb1'));

    await waitFor(() => {
      expect(result.current.guide).toEqual(mockGuide);
    });
    expect(result.current.notes).toBe('my notes');
  });

  it('sets notes to empty string when notes API returns null', async () => {
    window.vaultmind.notebooks.getGuide = vi.fn().mockResolvedValue(mockGuide);
    window.vaultmind.notes.get = vi.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useNotebook('nb1'));

    await waitFor(() => {
      expect(result.current.notes).toBe('');
    });
  });

  it('saves notes', async () => {
    window.vaultmind.notebooks.getGuide = vi.fn().mockResolvedValue(mockGuide);
    window.vaultmind.notes.get = vi.fn().mockResolvedValue({ content: '' });
    window.vaultmind.notes.save = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotebook('nb1'));

    await waitFor(() => expect(result.current.notes).toBe(''));

    await act(async () => {
      await result.current.saveNotes('updated notes');
    });

    expect(window.vaultmind.notes.save).toHaveBeenCalledWith('nb1', 'updated notes');
    expect(result.current.notes).toBe('updated notes');
  });

  it('refreshes guide without sourceIds', async () => {
    window.vaultmind.notebooks.getGuide = vi.fn().mockResolvedValue(mockGuide);
    window.vaultmind.notes.get = vi.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useNotebook('nb1'));

    await act(async () => {
      await result.current.refreshGuide();
    });

    expect(window.vaultmind.notebooks.getGuide).toHaveBeenCalledWith('nb1', undefined);
  });

  it('refreshes guide with sourceIds', async () => {
    window.vaultmind.notebooks.getGuide = vi.fn().mockResolvedValue(mockGuide);
    window.vaultmind.notes.get = vi.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useNotebook('nb1'));

    await act(async () => {
      await result.current.refreshGuide(['src1', 'src2']);
    });

    expect(window.vaultmind.notebooks.getGuide).toHaveBeenCalledWith('nb1', ['src1', 'src2']);
  });

  it('sets guide to null on load error', async () => {
    window.vaultmind.notebooks.getGuide = vi.fn().mockRejectedValue(new Error('fail'));
    window.vaultmind.notes.get = vi.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useNotebook('nb1'));

    await waitFor(() => {
      expect(result.current.guide).toBeNull();
    });
  });
});
