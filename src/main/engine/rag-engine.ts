import { searchSimilar } from './vector-store';
import { generateStream } from './llm';
import { generateSearchQuery } from './ollama';
import { searchWeb, type WebSearchResult } from './web-search';
import { getSystemPrompt } from './prompts';
import { buildContext } from './context-builder';
import { logger } from '../../shared/logger';
import type { Citation } from '../../shared/types';

interface StreamChatOptions {
  notebookId: string;
  message: string;
  onToken: (token: string) => void;
  onCitations: (citations: Citation[]) => void;
  activeSourceIds?: string[];
  signal?: AbortSignal;
  webSearch?: boolean;
}

/**
 * Main RAG chat loop: retrieves relevant document chunks, optionally performs
 * a web search, assembles context into a system prompt, streams the LLM
 * response, and filters citations to only those actually referenced.
 *
 * Returns the full response text.
 */
export async function streamChat(options: StreamChatOptions): Promise<string> {
  const { notebookId, message, onToken, onCitations, activeSourceIds, signal, webSearch } = options;

  const chunks = await searchSimilar(notebookId, message, undefined, activeSourceIds);

  logger.info('RAG', `Found ${chunks.length} chunks for query`);
  if (chunks.length > 0) {
    logger.info('RAG', `Top chunk (first 200 chars): ${chunks[0].text.slice(0, 200)}`);
  }

  let webResults: WebSearchResult[] = [];
  if (webSearch) {
    try {
      const searchQuery = await generateSearchQuery(message);
      webResults = await searchWeb(searchQuery);
    } catch (err) {
      logger.warn('RAG', `Web search failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (chunks.length === 0 && webResults.length === 0) {
    const noSourceMsg = 'No relevant information was found in the uploaded documents. Please upload relevant source files and try again.';
    onToken(noSourceMsg);
    onCitations([]);
    return noSourceMsg;
  }

  const { contextLines, citationMap, webCitationStart } = buildContext(chunks, webResults);

  const systemPrompt = getSystemPrompt(webSearch).replace('{context}', contextLines);

  logger.info('RAG', `Context length: ${contextLines.length} chars (${webResults.length > 0 ? webResults.length + ' web results + ' : ''}${chunks.length} doc chunks)`);

  let fullResponse = '';
  await generateStream({
    systemPrompt,
    userMessage: message,
    signal,
    onToken: (token) => {
      fullResponse += token;
      onToken(token);
    },
  });

  logger.info('RAG', `LLM response (first 300 chars): ${fullResponse.slice(0, 300)}`);

  const usedCitations = citationMap.filter((c, i) => {
    if (i >= webCitationStart) return true;
    const marker = `[${c.label}]`;
    return fullResponse.includes(marker);
  });

  onCitations(usedCitations);
  return fullResponse;
}
