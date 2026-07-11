import { searchSimilar } from './vector-store';
import { generateStream } from './llm';
import { logger } from '../../shared/logger';
import { getSetting } from '../database/settings';
import { generateSearchQuery } from './ollama';
import { searchWeb, type WebSearchResult } from './web-search';
import type { Citation } from '../../shared/types';

const DEFAULT_SYSTEM_PROMPT = `You are VaultMind, a private research assistant that answers based solely on the provided source documents. Your role is to analyze and synthesize information from those sources.

RULES:
1. Base your answer exclusively on the provided source documents — they are your single source of truth. Use your knowledge only to connect and synthesize what the sources contain.
2. Always cite your sources using inline markers like [1], [2], etc.
3. If the information is partially present in the sources, do your best to answer using what's available and note any gaps.
4. Be precise, factual, and professional.
5. When quoting or paraphrasing, indicate which source the information comes from.
6. Do not speculate or infer beyond what is explicitly stated in the documents.

CONTEXT:
{context}`;

const WEB_SEARCH_PROMPT = `You are VaultMind, a research assistant with access to both your knowledge base and live web search results. Your role is to provide comprehensive, well-sourced answers.

RULES:
1. Use the provided source documents AND web search results to answer the user's question.
2. Always cite your sources using inline markers like [1], [2], etc. Sources labeled "From " are from the user's documents. Sources labeled "From web search" are from live web results.
3. When information from web search conflicts with or supplements your document sources, present both sides and note any differences.
4. Be precise, factual, and professional. Clearly separate what is known from what is uncertain.
5. When quoting or paraphrasing, indicate which source the information comes from.
6. Your document sources are preferred for topics those documents cover; use web results to fill gaps or provide current/up-to-date information.

CONTEXT:
{context}`;

interface StreamChatOptions {
  notebookId: string;
  message: string;
  onToken: (token: string) => void;
  onCitations: (citations: Citation[]) => void;
  activeSourceIds?: string[];
  signal?: AbortSignal;
  webSearch?: boolean;
}

function getSystemPrompt(webSearch?: boolean): string {
  const userPrompt = getSetting('system_prompt');
  if (!userPrompt) {
    return webSearch ? WEB_SEARCH_PROMPT : DEFAULT_SYSTEM_PROMPT;
  }
  // If user has a custom prompt, replace the doc-only rule when web search is on
  if (webSearch) {
    return userPrompt
      .replace(/Base your answer exclusively on the provided source documents/i,
        'Base your answer on the provided source documents and web search results')
      .replace(/they are your single source of truth/i,
        'they are your primary source of truth, supplemented by web search results');
  }
  return userPrompt;
}

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
      logger.warn('RAG', `Web search failed: ${(err as Error).message}`);
    }
  }

  if (chunks.length === 0 && webResults.length === 0) {
    const noSourceMsg = 'No relevant information was found in the uploaded documents. Please upload relevant source files and try again.';
    onToken(noSourceMsg);
    onCitations([]);
    return noSourceMsg;
  }

  let labelCounter = 0;
  const citationMap: Citation[] = [];
  const allContext: string[] = [];

  // Document chunks
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

  // Web results (always included in citations regardless of LLM reference)
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

  const contextLines = allContext.join('\n\n---\n\n');
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
