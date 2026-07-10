const lancedb = require('@lancedb/lancedb');
const path = require('path');
const { app } = require('electron');
const { embedTexts, embedQuery, getEmbeddingDimension } = require('./embedder');
const { getSetting } = require('../database/settings');

const DB_PATH = path.join(app.getPath('userData'), 'data', 'vectors');

let db = null;

async function initVectorStore() {
  db = await lancedb.connect(DB_PATH);
  console.log('[VectorStore] Connected at', DB_PATH);
}

function getDb() {
  if (!db) throw new Error('Vector store not initialized');
  return db;
}

function tableNameFor(notebookId) {
  return `nb_${notebookId.replace(/-/g, '_')}`;
}

async function addChunks(notebookId, chunks) {
  // chunks: [{ text, sourceId, sourceTitle, page, chunkIndex, chunkId }]
  if (chunks.length === 0) return;

  const texts = chunks.map(c => c.text);
  const vectors = await embedTexts(texts);

  const rows = chunks.map((chunk, i) => ({
    vector: vectors[i],
    text: chunk.text,
    source_id: chunk.sourceId,
    source_title: chunk.sourceTitle || '',
    page: chunk.page || 0,
    chunk_index: chunk.chunkIndex || i,
    chunk_id: chunk.chunkId || `${chunk.sourceId}_${i}`,
  }));

  const tableName = tableNameFor(notebookId);
  const existing = await getDb().tableNames();
  if (existing.includes(tableName)) {
    const table = await getDb().openTable(tableName);
    await table.add(rows);
  } else {
    await getDb().createTable(tableName, rows);
  }
  console.log(`[VectorStore] Added ${rows.length} chunks to notebook ${notebookId}`);
}

async function searchSimilar(notebookId, queryText, topK = null) {
  const k = topK || parseInt(getSetting('retrieval_top_k') || '5', 10);
  const queryVector = await embedQuery(queryText);
  const tableName = tableNameFor(notebookId);

  const tables = await getDb().tableNames();
  if (!tables.includes(tableName)) return [];

  const table = await getDb().openTable(tableName);
  const results = await table.search(queryVector).limit(k).toArray();

  return results.map(r => ({
    text: r.text,
    sourceId: r.source_id,
    sourceTitle: r.source_title,
    page: r.page,
    chunkIndex: r.chunk_index,
    score: r._distance || 0,
  }));
}

async function deleteSourceVectors(sourceId) {
  // We need to find which notebooks contain this source
  // Since we store source_id in each row, we delete by filter
  const tables = await getDb().tableNames();
  for (const tableName of tables) {
    try {
      const table = await getDb().openTable(tableName);
      await table.delete(`source_id = '${sourceId}'`);
    } catch (_) {}
  }
  console.log(`[VectorStore] Deleted vectors for source ${sourceId}`);
}

async function deleteNotebookVectors(notebookId) {
  const tableName = tableNameFor(notebookId);
  const tables = await getDb().tableNames();
  if (tables.includes(tableName)) {
    await getDb().dropTable(tableName);
  }
}

module.exports = { initVectorStore, addChunks, searchSimilar, deleteSourceVectors, deleteNotebookVectors };
