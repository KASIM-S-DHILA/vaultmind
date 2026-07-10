const { EmbeddingModel, FlagEmbedding } = require('fastembed');
const { getSetting } = require('../database/settings');

const MODEL_MAP = {
  'all-MiniLM-L6-v2': EmbeddingModel.AllMiniLML6V2,
  'nomic-embed-text-v1.5': EmbeddingModel.NomicEmbedTextV15,
  'bge-small-en-v1.5': EmbeddingModel.BGESmallENV15,
};

const DIMENSIONS = {
  'all-MiniLM-L6-v2': 384,
  'nomic-embed-text-v1.5': 768,
  'bge-small-en-v1.5': 384,
};

let embedder = null;
let currentModelName = null;

async function getEmbedder() {
  const modelName = getSetting('embedding_model') || 'all-MiniLM-L6-v2';
  if (embedder && currentModelName === modelName) return embedder;

  // Unload previous
  embedder = null;

  const modelType = MODEL_MAP[modelName];
  if (!modelType) throw new Error(`Unknown embedding model: ${modelName}`);

  console.log(`[Embedder] Loading: ${modelName}`);
  embedder = await FlagEmbedding.init({ model: modelType });
  currentModelName = modelName;
  console.log(`[Embedder] Ready: ${modelName} (dim: ${DIMENSIONS[modelName]})`);
  return embedder;
}

async function embedTexts(texts) {
  const emb = await getEmbedder();
  const results = [];
  const BATCH_SIZE = 32;
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddingsGenerator = await emb.embed(batch);
    for await (const batchEmbeddings of embeddingsGenerator) {
      for (const vec of batchEmbeddings) {
        results.push(Array.from(vec));
      }
    }
  }
  return results;
}

async function embedQuery(text) {
  const emb = await getEmbedder();
  const result = await emb.queryEmbed(text);
  return Array.from(result);
}

function getEmbeddingDimension() {
  const name = getSetting('embedding_model') || 'all-MiniLM-L6-v2';
  return DIMENSIONS[name] || 384;
}

function getAvailableEmbeddingModels() {
  return Object.keys(MODEL_MAP).map(name => ({
    name,
    dimensions: DIMENSIONS[name],
    size: name === 'nomic-embed-text-v1.5' ? '~270 MB' : '~25 MB',
    description: name === 'all-MiniLM-L6-v2'
      ? 'Fast & lightweight — recommended for 8GB RAM'
      : name === 'nomic-embed-text-v1.5'
      ? 'Higher quality retrieval — best for large documents'
      : 'Balanced performance',
  }));
}

module.exports = { embedTexts, embedQuery, getEmbeddingDimension, getAvailableEmbeddingModels };
