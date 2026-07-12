import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSetting = vi.fn();

vi.mock('../main/database/settings', () => ({
  getSetting: mockGetSetting,
}));

const { getSystemPrompt, DEFAULT_SYSTEM_PROMPT, WEB_SEARCH_PROMPT } = await import('../main/engine/prompts');

describe('getSystemPrompt', () => {
  beforeEach(() => {
    mockGetSetting.mockReset();
  });

  it('returns DEFAULT_SYSTEM_PROMPT when no user prompt is set and webSearch is false', () => {
    mockGetSetting.mockReturnValue(null);
    const result = getSystemPrompt(false);
    expect(result).toBe(DEFAULT_SYSTEM_PROMPT);
  });

  it('returns WEB_SEARCH_PROMPT when no user prompt is set and webSearch is true', () => {
    mockGetSetting.mockReturnValue(null);
    const result = getSystemPrompt(true);
    expect(result).toBe(WEB_SEARCH_PROMPT);
  });

  it('returns the user prompt unchanged when webSearch is false', () => {
    const userPrompt = 'Custom prompt with {context}';
    mockGetSetting.mockReturnValue(userPrompt);
    const result = getSystemPrompt(false);
    expect(result).toBe(userPrompt);
  });

  it('replaces doc-only rules in user prompt when webSearch is true', () => {
    mockGetSetting.mockReturnValue(
      'Base your answer exclusively on the provided source documents. They are your single source of truth.',
    );
    const result = getSystemPrompt(true);
    expect(result).toContain('Base your answer on the provided source documents and web search results');
    expect(result).toContain('they are your primary source of truth, supplemented by web search results');
  });

  it('does not modify user prompt when webSearch is true but rules are absent', () => {
    const userPrompt = 'Just answer the question. {context}';
    mockGetSetting.mockReturnValue(userPrompt);
    const result = getSystemPrompt(true);
    expect(result).toBe(userPrompt);
  });
});
