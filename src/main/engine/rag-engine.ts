import { searchSimilar } from './vector-store';
import { generateStream } from './llm';
import { logger } from '../../shared/logger';
import type { Citation } from '../../shared/types';

const SYSTEM_PROMPT = `You are VaultMind, a private research assistant that answers based solely on the provided source documents. Your role is to analyze and synthesize information from those sources.

RULES:
1. Base your answer exclusively on the provided source documents — they are your single source of truth. Use your knowledge only to connect and synthesize what the sources contain.
2. Always cite your sources using inline markers like [1], [2], etc.
3. If the information is partially present in the sources, do your best to answer using what's available and note any gaps.
4. Be precise, factual, and professional.
5. When quoting or paraphrasing, indicate which source the information comes from.
6. Do not speculate or infer beyond what is explicitly stated in the documents.

CONTEXT:
{context}`;

interface StreamChatOptions {
  notebookId: string;
  message: string;
  onToken: (token: string) => void;
  onCitations: (citations: Citation[]) => void;
  activeSourceIds?: string[];
}

export async function streamChat(options: StreamChatOptions): Promise<string> {
  const { notebookId, message, onToken, onCitations, activeSourceIds } = options;

  const chunks = await searchSimilar(notebookId, message, undefined, activeSourceIds);

  logger.info('RAG', `Found ${chunks.length} chunks for query`);
  if (chunks.length > 0) {
    logger.info('RAG', `Top chunk (first 200 chars): ${chunks[0].text.slice(0, 200)}`);
  }

  if (chunks.length === 0) {
    const noSourceMsg = 'No relevant information was found in the uploaded documents. Please upload relevant source files and try again.';
    onToken(noSourceMsg);
    onCitations([]);
    return noSourceMsg;
  }

  const citationMap: Citation[] = [];
  const contextLines = chunks.map((chunk, i) => {
    const label = i + 1;
    citationMap.push({
      label,
      sourceId: chunk.sourceId,
      sourceTitle: chunk.sourceTitle,
      chunkText: chunk.text,
      page: chunk.page,
    });
    const pageInfo = chunk.page > 0 ? ` (page ${chunk.page})` : '';
    return `[${label}] From "${chunk.sourceTitle}":${pageInfo}\n${chunk.text}`;
  }).join('\n\n---\n\n');

  const systemPrompt = SYSTEM_PROMPT.replace('{context}', contextLines);

  logger.info('RAG', `Context length: ${contextLines.length} chars`);

  let fullResponse = '';
  await generateStream({
    systemPrompt,
    userMessage: message,
    onToken: (token) => {
      fullResponse += token;
      onToken(token);
    },
  });

  logger.info('RAG', `LLM response (first 300 chars): ${fullResponse.slice(0, 300)}`);

  const usedCitations = citationMap.filter(c => {
    const marker = `[${c.label}]`;
    return fullResponse.includes(marker);
  });

  onCitations(usedCitations);
  return fullResponse;
}
