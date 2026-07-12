import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetSetting = vi.fn();
const mockFetch = vi.fn();

vi.mock('../main/database/settings', () => ({ getSetting: mockGetSetting }));

// Mock global fetch
const originalFetch = globalThis.fetch;

const { generateSearchQuery, generateOllamaStream } = await import('../main/engine/ollama');

function setupSettings() {
  mockGetSetting.mockImplementation((key: string) => {
    if (key === 'ollama_url') return 'http://127.0.0.1:11434';
    if (key === 'ollama_model') return 'gemma3:4b';
    if (key === 'llm_temperature') return '0.3';
    if (key === 'llm_context_size') return '4096';
    return null;
  });
}

describe('generateSearchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettings();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns extracted query from LLM response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '"optimized search query"' } }),
    } as Response);

    const result = await generateSearchQuery('What is the capital of France?');

    expect(result).toBe('optimized search query');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('search query optimizer'),
      }),
    );
  });

  it('falls back to original message when LLM returns empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '' } }),
    } as Response);

    const result = await generateSearchQuery('original message');
    expect(result).toBe('original message');
  });

  it('strips surrounding quotes from the response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '"bare query"' } }),
    } as Response);

    const result = await generateSearchQuery('test');
    expect(result).toBe('bare query');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal error',
    } as Response);

    await expect(generateSearchQuery('test')).rejects.toThrow('Search query generation failed: 500');
  });
});

describe('generateOllamaStream', () => {
  let mockReader: { read: ReturnType<typeof vi.fn>; releaseLock: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    setupSettings();
    globalThis.fetch = mockFetch;

    mockReader = {
      read: vi.fn(),
      releaseLock: vi.fn(),
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function makeStreamResponse(): Response {
    return {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    } as unknown as Response;
  }

  it('streams tokens from Ollama response', async () => {
    const encoder = new TextEncoder();
    mockReader.read
      .mockResolvedValueOnce({ done: false, value: encoder.encode('{"message":{"content":"Hello"}}\n{"message":{"content":" world"}}\n') })
      .mockResolvedValueOnce({ done: true, value: undefined });

    mockFetch.mockResolvedValue(makeStreamResponse());

    const onToken = vi.fn();
    const result = await generateOllamaStream({
      systemPrompt: 'Be helpful',
      userMessage: 'Hi',
      onToken,
    });

    expect(result).toBe('Hello world');
    expect(onToken).toHaveBeenNthCalledWith(1, 'Hello');
    expect(onToken).toHaveBeenNthCalledWith(2, ' world');
  });

  it('handles empty reads gracefully', async () => {
    const encoder = new TextEncoder();
    mockReader.read
      .mockResolvedValueOnce({ done: false, value: encoder.encode('') })
      .mockResolvedValueOnce({ done: false, value: encoder.encode('{"message":{"content":"data"}}\n') })
      .mockResolvedValueOnce({ done: true, value: undefined });

    mockFetch.mockResolvedValue(makeStreamResponse());

    const onToken = vi.fn();
    const result = await generateOllamaStream({
      systemPrompt: 'X',
      userMessage: 'Y',
      onToken,
    });

    expect(result).toBe('data');
    expect(onToken).toHaveBeenCalledTimes(1);
  });

  it('skips malformed JSON lines', async () => {
    const encoder = new TextEncoder();
    mockReader.read
      .mockResolvedValueOnce({ done: false, value: encoder.encode('not json\n{"message":{"content":"valid"}}\n') })
      .mockResolvedValueOnce({ done: true, value: undefined });

    mockFetch.mockResolvedValue(makeStreamResponse());

    const onToken = vi.fn();
    const result = await generateOllamaStream({
      systemPrompt: 'X',
      userMessage: 'Y',
      onToken,
    });

    expect(result).toBe('valid');
    expect(onToken).toHaveBeenCalledTimes(1);
  });

  it('throws AbortError when signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    // When aborted, fetch itself rejects
    mockFetch.mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));

    const onToken = vi.fn();

    await expect(generateOllamaStream({
      systemPrompt: 'X',
      userMessage: 'Y',
      onToken,
      signal: controller.signal,
    })).rejects.toThrow();
  });

  it('releases reader lock in finally block', async () => {
    mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });
    mockFetch.mockResolvedValue(makeStreamResponse());

    await generateOllamaStream({
      systemPrompt: 'X',
      userMessage: 'Y',
      onToken: vi.fn(),
    });

    expect(mockReader.releaseLock).toHaveBeenCalled();
  });
});
