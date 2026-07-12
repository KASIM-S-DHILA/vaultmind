import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSearchSimilar = vi.fn();
const mockGenerateStream = vi.fn();
const mockGenerateSearchQuery = vi.fn();
const mockSearchWeb = vi.fn();
const mockGetSystemPrompt = vi.fn();
const mockBuildContext = vi.fn();

vi.mock('../main/engine/vector-store', () => ({ searchSimilar: mockSearchSimilar }));
vi.mock('../main/engine/llm', () => ({ generateStream: mockGenerateStream }));
vi.mock('../main/engine/ollama', () => ({ generateSearchQuery: mockGenerateSearchQuery }));
vi.mock('../main/engine/web-search', () => ({ searchWeb: mockSearchWeb }));
vi.mock('../main/engine/prompts', () => ({ getSystemPrompt: mockGetSystemPrompt }));
vi.mock('../main/engine/context-builder', () => ({ buildContext: mockBuildContext }));

const { streamChat } = await import('../main/engine/rag-engine');

const defaultChunks = [
  { text: 'chunk about AI', sourceId: 's1', sourceTitle: 'Doc 1', page: 1, chunkIndex: 0, score: 0.95 },
];

const defaultContext = {
  contextLines: '[1] From "Doc 1":\nchunk about AI',
  citationMap: [{ label: 1, sourceId: 's1', sourceTitle: 'Doc 1', chunkText: 'chunk about AI', page: 1 }],
  webCitationStart: 1,
};

describe('streamChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSystemPrompt.mockReturnValue('System prompt:\n{context}');
    mockBuildContext.mockReturnValue(defaultContext);
    mockGenerateStream.mockImplementation(async ({ onToken }) => {
      onToken('Here is the answer based on [1].');
    });
  });

  it('retrieves chunks and streams response', async () => {
    mockSearchSimilar.mockResolvedValue(defaultChunks);

    const onToken = vi.fn();
    const onCitations = vi.fn();

    await streamChat({ notebookId: 'nb1', message: 'what is AI?', onToken, onCitations });

    expect(mockSearchSimilar).toHaveBeenCalledWith('nb1', 'what is AI?', undefined, undefined);
    expect(mockGetSystemPrompt).toHaveBeenCalledWith(undefined);
    expect(mockGenerateStream).toHaveBeenCalled();
    expect(onToken).toHaveBeenCalledWith('Here is the answer based on [1].');
  });

  it('includes filtered source IDs in search', async () => {
    mockSearchSimilar.mockResolvedValue(defaultChunks);

    const onToken = vi.fn();
    const onCitations = vi.fn();

    await streamChat({ notebookId: 'nb1', message: 'q', activeSourceIds: ['s1'], onToken, onCitations });

    expect(mockSearchSimilar).toHaveBeenCalledWith('nb1', 'q', undefined, ['s1']);
  });

  it('performs web search when webSearch is true', async () => {
    mockSearchSimilar.mockResolvedValue(defaultChunks);
    mockGenerateSearchQuery.mockResolvedValue('optimized query');
    mockSearchWeb.mockResolvedValue([{ title: 'Web Res', url: 'https://x.com', content: 'web content', snippet: 'web snippet' }]);

    const onToken = vi.fn();
    const onCitations = vi.fn();

    await streamChat({ notebookId: 'nb1', message: 'q', webSearch: true, onToken, onCitations });

    expect(mockGenerateSearchQuery).toHaveBeenCalledWith('q');
    expect(mockSearchWeb).toHaveBeenCalledWith('optimized query');
    expect(mockGetSystemPrompt).toHaveBeenCalledWith(true);
  });

  it('returns no-source message when no chunks or web results', async () => {
    mockSearchSimilar.mockResolvedValue([]);

    const onToken = vi.fn();
    const onCitations = vi.fn();

    const result = await streamChat({ notebookId: 'nb1', message: 'q', onToken, onCitations });

    expect(result).toContain('No relevant information was found');
    expect(onToken).toHaveBeenCalledWith(result);
    expect(onCitations).toHaveBeenCalledWith([]);
    expect(mockGenerateStream).not.toHaveBeenCalled();
  });

  it('filters citations to only referenced ones', async () => {
    mockSearchSimilar.mockResolvedValue(defaultChunks);
    mockBuildContext.mockReturnValue({
      contextLines: '[1] From "Doc 1":\ncontent\n\n---\n\n[2] From "Doc 2":\nmore',
      citationMap: [
        { label: 1, sourceId: 's1', sourceTitle: 'Doc 1', chunkText: 'content', page: 1 },
        { label: 2, sourceId: 's2', sourceTitle: 'Doc 2', chunkText: 'more', page: 1 },
      ],
      webCitationStart: 2,
    });
    mockGenerateStream.mockImplementation(async ({ onToken }) => {
      onToken('Answer citing [2] only.');
    });

    const onToken = vi.fn();
    const onCitations = vi.fn();

    await streamChat({ notebookId: 'nb1', message: 'q', onToken, onCitations });

    expect(onCitations).toHaveBeenCalledWith([
      expect.objectContaining({ label: 2 }),
    ]);
  });

  it('forwards abort signal to generateStream', async () => {
    mockSearchSimilar.mockResolvedValue(defaultChunks);
    const signal = new AbortController().signal;

    const onToken = vi.fn();
    const onCitations = vi.fn();

    await streamChat({ notebookId: 'nb1', message: 'q', signal, onToken, onCitations });

    expect(mockGenerateStream).toHaveBeenCalledWith(expect.objectContaining({ signal }));
  });

  it('continues when web search fails', async () => {
    mockSearchSimilar.mockResolvedValue(defaultChunks);
    mockGenerateSearchQuery.mockRejectedValue(new Error('API down'));

    const onToken = vi.fn();
    const onCitations = vi.fn();

    await streamChat({ notebookId: 'nb1', message: 'q', webSearch: true, onToken, onCitations });

    expect(mockGenerateStream).toHaveBeenCalled();
    expect(onToken).toHaveBeenCalled();
  });

  it('returns full response text', async () => {
    mockSearchSimilar.mockResolvedValue(defaultChunks);

    const result = await streamChat({
      notebookId: 'nb1', message: 'q',
      onToken: vi.fn(), onCitations: vi.fn(),
    });

    expect(result).toBe('Here is the answer based on [1].');
  });
});
