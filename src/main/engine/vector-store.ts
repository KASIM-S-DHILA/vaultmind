/**
 * Vector store backed by LanceDB.
 *
 * Each notebook gets its own table (`nb_<notebookId>`). Chunks are added with
 * their embedding vectors and searchable via cosine-similarity ANN search,
 * with optional source-id filtering.
 */
import lancedb = require('@lancedb/lancedb');
import path = require('path');
import { app } from 'electron';
import { embedTexts, embedQuery } from './embedder';
import { getSetting } from '../database/settings';
import { logger } from '../../shared/logger';
import { VECTOR_DB_DIR } from '../../shared/constants';
import type { Citation } from '../../shared/types';

const DB_PATH = path.join(app.getPath('userData'), VECTOR_DB_DIR);

let db: lancedb.Connection | null = null;

export async function initVectorStore(): Promise<void> {
  db = await lancedb.connect(DB_PATH);
  logger.info('VectorStore', 'Connected at', DB_PATH);
}

function getDb(): lancedb.Connection {
  if (!db) throw new Error('Vector store not initialized');
  return db;
}

function tableNameFor(notebookId: string): string {
  return 'nb_' + notebookId.replace(/-/g, '_');
}

interface ChunkInput {
  text: string;
  sourceId: string;
  sourceTitle?: string;
  page?: number;
  chunkIndex?: number;
  chunkId?: string;
}

interface SearchResult {
  text: string;
  sourceId: string;
  sourceTitle: string;
  page: number;
  chunkIndex: number;
  score: number;
}

export async function addChunks(notebookId: string, chunks: ChunkInput[]): Promise<void> {
  if (chunks.length === 0) return;

  const texts = chunks.map(c => c.text);
  const vectors = await embedTexts(texts);

  const rows = chunks.map((chunk, i) => ({
    vector: vectors[i],
    text: chunk.text,
    source_id: chunk.sourceId,
    source_title: chunk.sourceTitle || '',
    page: chunk.page || 0,
    chunk_index: chunk.chunkIndex ?? i,
    chunk_id: chunk.chunkId ?? chunk.sourceId + '_' + i,
  }));

  const tableName = tableNameFor(notebookId);
  const existing = await getDb().tableNames();
  if (existing.includes(tableName)) {
    const table = await getDb().openTable(tableName);
    await table.add(rows);
  } else {
    await getDb().createTable(tableName, rows);
  }
  logger.info('VectorStore', `Added ${chunks.length} chunks to notebook ${tableName}`);
}

export async function searchSimilar(
  notebookId: string,
  queryText: string,
  topK?: number,
  sourceFilter?: string[],
): Promise<SearchResult[]> {
  const k = topK ?? parseInt(getSetting('retrieval_top_k') ?? '5', 10);
  const queryVector = await embedQuery(queryText);
  const tableName = tableNameFor(notebookId);

  const tables = await getDb().tableNames();
  if (!tables.includes(tableName)) {
    logger.info('VectorStore', 'No table found for notebook', notebookId);
    return [];
  }

  const table = await getDb().openTable(tableName);

  let query = (table as any).search(queryVector).limit(k);

  if (sourceFilter && sourceFilter.length > 0) {
    const ids = sourceFilter.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');
    query = query.filter(`source_id IN (${ids})`);
  }

  const results = await query.toArray();

  logger.info('VectorStore', `Search returned ${results.length} results (top K=${k})`);

  return results.map((r: any) => ({
    text: r.text,
    sourceId: r.source_id,
    sourceTitle: r.source_title,
    page: r.page,
    chunkIndex: r.chunk_index,
    score: r._distance || 0,
  }));
}

export async function deleteSourceVectors(sourceId: string): Promise<void> {
  const tables = await getDb().tableNames();
  for (const tableName of tables) {
    try {
      const table = await getDb().openTable(tableName);
      const safeId = sourceId.replace(/'/g, "''");
      await table.delete(`source_id = '${safeId}'`);
    } catch (err) {
      logger.warn('VectorStore', 'Table might not have this source — skip:', err instanceof Error ? err.message : String(err));
    }
  }
  logger.info('VectorStore', 'Deleted vectors for source', sourceId);
}

export async function deleteNotebookVectors(notebookId: string): Promise<void> {
  const tableName = tableNameFor(notebookId);
  const tables = await getDb().tableNames();
  if (tables.includes(tableName)) {
    await getDb().dropTable(tableName);
  }
}
