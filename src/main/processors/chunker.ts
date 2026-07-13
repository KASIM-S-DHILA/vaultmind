import { v4 as uuidv4 } from 'uuid';
import { getSetting } from '../database/settings';
import { CHUNK_DEFAULTS } from '../../shared/constants';

interface PageData {
  pageNum: number;
  text: string;
}

interface ChunkInput {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  page: number;
  chunkIndex: number;
  text: string;
}

export async function chunkText(
  pages: PageData[],
  { sourceId, sourceTitle }: { sourceId: string; sourceTitle: string },
): Promise<ChunkInput[]> {
  const chunkSize = parseInt(getSetting('chunk_size') || String(CHUNK_DEFAULTS.SIZE), 10);
  const chunkOverlap = parseInt(getSetting('chunk_overlap') || String(CHUNK_DEFAULTS.OVERLAP), 10);

  const chunks: ChunkInput[] = [];
  let sentenceCount = 0;

  for (const { pageNum, text } of pages) {
    const sentences = splitIntoSentences(text);
    let buffer = '';

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (buffer.length + sentence.length > chunkSize && buffer.length > 0) {
        const contextPrefix = `[From "${sourceTitle}"${pageNum > 0 ? `, page ${pageNum}` : ''}] `;
        chunks.push({
          chunkId: uuidv4(),
          sourceId,
          sourceTitle,
          page: pageNum,
          chunkIndex: chunks.length,
          text: contextPrefix + buffer.trim(),
        });
        buffer = buffer.slice(-chunkOverlap) + sentence;
      } else {
        buffer += (buffer ? ' ' : '') + sentence;
      }

      sentenceCount++;
      if (sentenceCount % 10 === 0) {
        await new Promise<void>(r => setTimeout(r, 0));
      }
    }

    if (buffer.trim().length > 20) {
      const contextPrefix = `[From "${sourceTitle}"${pageNum > 0 ? `, page ${pageNum}` : ''}] `;
      chunks.push({
        chunkId: uuidv4(),
        sourceId,
        sourceTitle,
        page: pageNum,
        chunkIndex: chunks.length,
        text: contextPrefix + buffer.trim(),
      });
    }
  }

  return chunks;
}

function splitIntoSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
