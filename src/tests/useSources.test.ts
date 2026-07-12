import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSources } from '../renderer/hooks/useSources';

const mockSources = [
  { id: 'src1', notebook_id: 'nb1', filename: 'doc1.pdf', status: 'ready', active: 1 },
  { id: 'src2', notebook_id: 'nb1', filename: 'doc2.txt', status: 'ready', active: 0 },
];

describe('useSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads sources on mount', async () => {
    window.vaultmind.sources.list = vi.fn().mockResolvedValue(mockSources);

    const { result } = renderHook(() => useSources('nb1'));

    await waitFor(() => {
      expect(result.current.sources).toHaveLength(2);
    });
    expect(result.current.sources[0].filename).toBe('doc1.pdf');
  });

  it('subscribes to progress events and returns cleanup', async () => {
    window.vaultmind.sources.list = vi.fn().mockResolvedValue([]);
    const cleanupFn = vi.fn();
    window.vaultmind.sources.onProgress = vi.fn().mockReturnValue(cleanupFn);

    const { result, unmount } = renderHook(() => useSources('nb1'));

    await waitFor(() => expect(result.current.sources).toHaveLength(0));
    expect(window.vaultmind.sources.onProgress).toHaveBeenCalled();

    unmount();
    expect(cleanupFn).toHaveBeenCalled();
  });

  it('updates source progress on processing event', async () => {
    window.vaultmind.sources.list = vi.fn().mockResolvedValue(mockSources);
    let progressCb: Function = () => {};
    window.vaultmind.sources.onProgress = vi.fn().mockImplementation((cb) => {
      progressCb = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useSources('nb1'));

    await waitFor(() => expect(result.current.sources).toHaveLength(2));

    act(() => {
      progressCb({ sourceId: 'src1', status: 'processing', progress: 50 });
    });

    expect(result.current.sources[0].progress).toBe(50);
  });

  it('reloads sources on ready progress event', async () => {
    let progressCb: Function = () => {};
    window.vaultmind.sources.list = vi.fn()
      .mockResolvedValueOnce(mockSources)
      .mockResolvedValueOnce([...mockSources, { id: 'src3', notebook_id: 'nb1', filename: 'doc3.md', status: 'ready', active: 1 }]);
    window.vaultmind.sources.onProgress = vi.fn().mockImplementation((cb) => {
      progressCb = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useSources('nb1'));

    await waitFor(() => expect(result.current.sources).toHaveLength(2));

    await act(async () => {
      progressCb({ sourceId: 'src3', status: 'ready', progress: 100 });
    });

    await waitFor(() => expect(result.current.sources).toHaveLength(3));
  });

  it('uploads files and refreshes', async () => {
    window.vaultmind.sources.list = vi.fn().mockResolvedValue([]);
    window.vaultmind.sources.upload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useSources('nb1'));

    await act(async () => {
      await result.current.uploadFiles(['/path/to/file.pdf']);
    });

    expect(window.vaultmind.sources.upload).toHaveBeenCalledWith('nb1', ['/path/to/file.pdf']);
    expect(window.vaultmind.sources.list).toHaveBeenCalledTimes(2); // initial + after upload
  });

  it('deletes source and refreshes', async () => {
    window.vaultmind.sources.list = vi.fn().mockResolvedValue(mockSources);
    window.vaultmind.sources.delete = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useSources('nb1'));

    await waitFor(() => expect(result.current.sources).toHaveLength(2));

    await act(async () => {
      await result.current.deleteSource('src1');
    });

    expect(window.vaultmind.sources.delete).toHaveBeenCalledWith('src1');
  });

  it('toggles source active state', async () => {
    window.vaultmind.sources.list = vi.fn().mockResolvedValue(mockSources);
    window.vaultmind.sources.setActive = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useSources('nb1'));

    await waitFor(() => expect(result.current.sources).toHaveLength(2));

    await act(async () => {
      await result.current.setSourceActive('src1', false);
    });

    expect(window.vaultmind.sources.setActive).toHaveBeenCalledWith('src1', false);
  });
});
