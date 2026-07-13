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

function yieldToGUI(): Promise<void> {
  return new Promise<void>(r => setTimeout(r, 0));
}

const PAGE_BATCH_SIZE = 1;

function pagesInBatches(pages: Array<{ pageNum: number; text: string }>): Array<Array<{ pageNum: number; text: string }>> {
  const batches: Array<Array<{ pageNum: number; text: string }>> = [];
  for (let i = 0; i < pages.length; i += PAGE_BATCH_SIZE) {
    batches.push(pages.slice(i, i + PAGE_BATCH_SIZE));
  }
  return batches;
}

export async function processFile(options: ProcessFileOptions): Promise<void> {
  const { id, filePath, fileType, notebookId, sendProgress } = options;

  if (!SUPPORTED_TYPES.includes(fileType)) {
    throw new Error(`Unsupported file type: .${fileType}. Please upload PDF, TXT, MD, or CSV files only.`);
  }

  sendProgress({ status: 'processing', progress: 5, message: 'Reading file...' });
  await yieldToGUI();

  let pages: Array<{ pageNum: number; text: string }> = [];

  if (fileType === 'pdf') {
    sendProgress({ status: 'processing', progress: 10, message: 'Extracting PDF text...' });
    pages = await processPDF(filePath);
  } else {
    pages = await processText(filePath);
  }
  await yieldToGUI();

  const filename = path.basename(filePath);
  const totalPages = pages.length;
  let totalChunks = 0;
  let firstBatch = true;

  for (const batch of pagesInBatches(pages)) {
    sendProgress({
      status: 'processing',
      progress: 15,
      message: `Chunking batch ${batch[0].pageNum}-${batch[batch.length - 1].pageNum} of ${totalPages}...`,
    });
    await yieldToGUI();
    const chunks = await chunkText(batch, { sourceId: id, sourceTitle: filename });
    totalChunks += chunks.length;

    if (chunks.length === 0) continue;

    // Generate summary on the first batch only (from first 3 pages of the doc)
    if (firstBatch) {
      sendProgress({ status: 'processing', progress: 18, message: 'Generating summary...' });
      await yieldToGUI();
      const sampleText = pages.slice(0, 3).map(p => p.text).join('\n\n');
      const summary = await generateSourceSummary(id, sampleText);
      updateSourceStatus(id, 'processing', { summary });
      await yieldToGUI();
      firstBatch = false;
    }

    sendProgress({
      status: 'processing',
      progress: 20,
      message: `Embedding batch ${batch[0].pageNum}-${batch[batch.length - 1].pageNum} (${chunks.length} chunks)...`,
    });
    await yieldToGUI();
    await addChunks(notebookId, chunks);
  }

  const stats = await stat(filePath);
  updateSourceStatus(id, 'ready', { chunk_count: totalChunks });

  logger.info('Processor', `File processed: ${filename} (${totalChunks} chunks, ${stats.size} bytes)`);
  sendProgress({ status: 'ready', progress: 100, message: 'Ready' });
}
