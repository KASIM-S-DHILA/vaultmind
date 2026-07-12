/**
 * File processing pipeline: select the right extractor (PDF vs text),
 * split pages into chunks, generate an LLM summary, embed and store
 * chunks in the vector store, and emit progress events.
 *
 * Supported types are defined in `SUPPORTED_TYPES` and must also be
 * listed in the renderer's file-dialog filter.
 */
import path from 'path';
import { stat } from 'fs/promises';
import { processPDF } from './pdf-processor';
import { processText } from './text-processor';
import { chunkText } from './chunker';
import { addChunks } from '../engine/vector-store';
import { generateSourceSummary } from '../engine/summarizer';
import { updateSourceStatus } from '../database/sources.repository';
import { logger } from '../../shared/logger';

interface ProcessFileOptions {
  id: string;
  filePath: string;
  fileType: string;
  notebookId: string;
  sendProgress: (data: Record<string, unknown>) => void;
}

const SUPPORTED_TYPES = ['pdf', 'txt', 'md', 'csv'];

export async function processFile(options: ProcessFileOptions): Promise<void> {
  const { id, filePath, fileType, notebookId, sendProgress } = options;

  if (!SUPPORTED_TYPES.includes(fileType)) {
    throw new Error(`Unsupported file type: .${fileType}. Please upload PDF, TXT, MD, or CSV files only.`);
  }

  sendProgress({ status: 'processing', progress: 5, message: 'Reading file...' });

  let pages: Array<{ pageNum: number; text: string }> = [];

  if (fileType === 'pdf') {
    sendProgress({ status: 'processing', progress: 10, message: 'Extracting PDF text...' });
    pages = await processPDF(filePath);
  } else {
    pages = await processText(filePath);
  }

  sendProgress({ status: 'processing', progress: 55, message: 'Splitting into chunks...' });
  const filename = path.basename(filePath);
  const chunks = chunkText(pages, { sourceId: id, sourceTitle: filename });

  sendProgress({ status: 'processing', progress: 60, message: 'Generating summary...' });
  const sampleText = pages.slice(0, 3).map(p => p.text).join('\n\n');
  const summary = await generateSourceSummary(id, sampleText);
  updateSourceStatus(id, 'processing', { summary });

  sendProgress({ status: 'processing', progress: 70, message: `Embedding ${chunks.length} chunks...` });
  await addChunks(notebookId, chunks);

  const stats = await stat(filePath);
  updateSourceStatus(id, 'ready', { chunk_count: chunks.length });

  logger.info('Processor', `File processed: ${filename} (${chunks.length} chunks, ${stats.size} bytes)`);
  sendProgress({ status: 'ready', progress: 100, message: 'Ready' });
}
