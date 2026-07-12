import { searchSimilar } from './vector-store';
import { generateStream } from './llm';
import { GUIDE_PROMPT, SUMMARY_PROMPT } from './prompts';
import { dbAll } from '../database/sqlite';
import { logger } from '../../shared/logger';
import type { NotebookGuide } from '../../shared/types';

/**
 * Generates a notebook guide (overview, key themes, suggested questions)
 * by retrieving the most relevant chunks and asking the LLM to summarise them.
 */
export async function generateNotebookGuide(notebookId: string, sourceIds?: string[]): Promise<NotebookGuide> {
  if (!sourceIds) {
    const sourceRows = dbAll<{ id: string }>('SELECT id FROM sources WHERE notebook_id = ? AND status = ?', [notebookId, 'ready']);
    if (sourceRows.length === 0) return { overview: '', keyThemes: [], suggestedQuestions: [] };
    sourceIds = sourceRows.map(s => s.id);
  }

  if (sourceIds.length === 0) return { overview: '', keyThemes: [], suggestedQuestions: [] };
  const chunks = await searchSimilar(notebookId, 'overview summary key themes', 20, sourceIds);

  if (chunks.length === 0) {
    return { overview: '', keyThemes: [], suggestedQuestions: [] };
  }

  const context = chunks.map((c, i) =>
    `[${i + 1}] From "${c.sourceTitle}"${c.page > 0 ? ` (page ${c.page})` : ''}:\n${c.text}`
  ).join('\n\n---\n\n');

  const systemPrompt = GUIDE_PROMPT.replace('{context}', context);

  let fullResponse = '';
  await generateStream({
    systemPrompt,
    userMessage: 'Generate the notebook guide based on the provided excerpts.',
    onToken: (token) => {
      fullResponse += token;
    },
  });

  try {
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as NotebookGuide;
    }
  } catch (err) {
    logger.error('Summarizer', 'Failed to parse guide JSON:', err instanceof Error ? err.message : String(err));
  }

  return { overview: fullResponse.slice(0, 300), keyThemes: [], suggestedQuestions: [] };
}

/**
 * Generates a 2-3 sentence summary for a single source document.
 * Falls back to a text prefix if the LLM call fails.
 */
export async function generateSourceSummary(sourceId: string, text: string): Promise<string> {
  if (!text || text.length < 50) return text?.slice(0, 200) ?? '';

  const systemPrompt = SUMMARY_PROMPT.replace('{text}', text.slice(0, 2000));

  let fullResponse = '';
  await generateStream({
    systemPrompt,
    userMessage: 'Provide a brief summary.',
    onToken: (token) => {
      fullResponse += token;
    },
  });

  return fullResponse.trim() || text.slice(0, 200);
}
