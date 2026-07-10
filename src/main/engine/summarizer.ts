import { searchSimilar } from './vector-store';
import { generateStream } from './llm';
import { dbAll } from '../database/sqlite';
import { logger } from '../../shared/logger';
import type { NotebookGuide } from '../../shared/types';

const GUIDE_PROMPT = `You are an expert legal analyst. Given the document excerpts below, provide a comprehensive notebook guide.

Return valid JSON only with this structure:
{
  "overview": "2-3 sentence overview of what the documents cover",
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "suggestedQuestions": ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]
}

Document excerpts:
{context}`;

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
    logger.error('Summarizer', 'Failed to parse guide JSON:', (err as Error).message);
  }

  return { overview: fullResponse.slice(0, 300), keyThemes: [], suggestedQuestions: [] };
}

const SUMMARY_PROMPT = `Summarize the following document text in 2-3 sentences. Focus on the key points for legal analysis.

Text:
{text}`;

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
