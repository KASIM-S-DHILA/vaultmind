import type { Citation } from '../../shared/types';

/** A single chunk returned from the vector store. */
interface ChunkResult {
  text: string;
  sourceId: string;
  sourceTitle: string;
  page: number;
  chunkIndex: number;
  score: number;
}

/** A single result from the web search provider. */
interface WebSearchResult {
  title: string;
  url: string;
  content?: string;
  snippet: string;
}

/** Output of the context builder — the assembled context string, citation map, and the label offset for web results. */
interface BuildContextResult {
  contextLines: string;
  citationMap: Citation[];
  webCitationStart: number;
}

/**
 * Builds the context string and citation map from a list of document chunks
 * and (optionally) web search results.
 *
 * Document chunks get numeric labels starting at 1; web results continue
 * sequentially. The returned context string is a single block of text with
 * each source separated by a visual delimiter, ready to be injected into
 * a system prompt's {context} placeholder.
 */
export function buildContext(
  chunks: ChunkResult[],
  webResults: WebSearchResult[],
): BuildContextResult {
  let labelCounter = 0;
  const citationMap: Citation[] = [];
  const allContext: string[] = [];

  for (const chunk of chunks) {
    labelCounter++;
    citationMap.push({
      label: labelCounter,
      sourceId: chunk.sourceId,
      sourceTitle: chunk.sourceTitle,
      chunkText: chunk.text,
      page: chunk.page,
    });
    const pageInfo = chunk.page > 0 ? ` (page ${chunk.page})` : '';
    allContext.push(`[${labelCounter}] From "${chunk.sourceTitle}":${pageInfo}\n${chunk.text}`);
  }

  const webCitationStart = citationMap.length;
  for (const wr of webResults) {
    labelCounter++;
    citationMap.push({
      label: labelCounter,
      sourceId: 'web-' + labelCounter,
      sourceTitle: 'Web: ' + wr.title,
      chunkText: wr.content || wr.snippet,
      page: 0,
    });
    const contentPreview = wr.content ? wr.content.slice(0, 800) : wr.snippet;
    allContext.push(`[${labelCounter}] From web search — "${wr.title}":\n${contentPreview}\nSource: ${wr.url}`);
  }

  return {
    contextLines: allContext.join('\n\n---\n\n'),
    citationMap,
    webCitationStart,
  };
}
