import { describe, it, expect } from 'vitest';
import { buildContext } from '../main/engine/context-builder';

describe('buildContext', () => {
  const chunks = [
    { text: 'Chunk one content', sourceId: 'src1', sourceTitle: 'Doc A', page: 2, chunkIndex: 0, score: 0.95 },
    { text: 'Chunk two content', sourceId: 'src2', sourceTitle: 'Doc B', page: 5, chunkIndex: 1, score: 0.90 },
  ];

  const webResults = [
    { title: 'Web Result 1', url: 'https://example.com/1', content: 'Web snippet one', snippet: 'fallback snippet' },
    { title: 'Web Result 2', url: 'https://example.com/2', content: '', snippet: 'only snippet' },
  ];

  it('assigns sequential labels starting at 1 for doc chunks', () => {
    const { citationMap } = buildContext(chunks, []);
    expect(citationMap).toHaveLength(2);
    expect(citationMap[0].label).toBe(1);
    expect(citationMap[1].label).toBe(2);
  });

  it('includes page info when page > 0', () => {
    const { contextLines } = buildContext(chunks, []);
    expect(contextLines).toContain('(page 2)');
    expect(contextLines).toContain('(page 5)');
  });

  it('omits page info when page is 0', () => {
    const noPage = [{ ...chunks[0], page: 0 }];
    const { contextLines } = buildContext(noPage, []);
    expect(contextLines).not.toContain('(page ');
  });

  it('labels web results after doc chunks and prefixes sourceId with web-', () => {
    const { citationMap } = buildContext(chunks, webResults);
    expect(citationMap).toHaveLength(4);
    expect(citationMap[2].label).toBe(3);
    expect(citationMap[2].sourceId).toBe('web-3');
    expect(citationMap[2].sourceTitle).toContain('Web:');
    expect(citationMap[3].label).toBe(4);
    expect(citationMap[3].sourceId).toBe('web-4');
  });

  it('uses content over snippet when content is available', () => {
    const { citationMap } = buildContext([], [webResults[0]]);
    expect(citationMap[0].chunkText).toBe('Web snippet one');
  });

  it('falls back to snippet when content is empty', () => {
    const { citationMap } = buildContext([], [webResults[1]]);
    expect(citationMap[0].chunkText).toBe('only snippet');
  });

  it('returns webCitationStart equal to number of doc chunks', () => {
    const result = buildContext(chunks, webResults);
    expect(result.webCitationStart).toBe(2);
  });

  it('separates sources with --- delimiter', () => {
    const { contextLines } = buildContext(chunks, webResults);
    const parts = contextLines.split('---');
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty contextLines and citationMap when both inputs are empty', () => {
    const { contextLines, citationMap } = buildContext([], []);
    expect(contextLines).toBe('');
    expect(citationMap).toEqual([]);
  });
});
