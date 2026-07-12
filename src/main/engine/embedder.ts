import { EmbeddingModel, FlagEmbedding } from 'fastembed';
import { getSetting } from '../database/settings';
import { DEFAULT_SETTINGS, EMBEDDING_MODELS, CHUNK_DEFAULTS } from '../../shared/constants';
import { logger } from '../../shared/logger';

type ModelName = keyof typeof EMBEDDING_MODELS;

const MODEL_MAP: Record<string, EmbeddingModel> = {
  'all-MiniLM-L6-v2': EmbeddingModel.AllMiniLML6V2,
  'nomic-embed-text-v1.5': EmbeddingModel.BGEBaseENV15,
  'bge-small-en-v1.5': EmbeddingModel.BGESmallENV15,
};

let embedder: FlagEmbedding | null = null;
let currentModelName: string | null = null;
let embedderInitPromise: Promise<FlagEmbedding> | null = null;

async function getEmbedder(): Promise<FlagEmbedding> {
  const modelName = (getSetting('embedding_model') || DEFAULT_SETTINGS.EMBEDDING_MODEL) as ModelName;
  if (embedder && currentModelName === modelName) return embedder;

  if (embedderInitPromise) return embedderInitPromise;

  embedderInitPromise = (async () => {
    embedder = null;
    const modelType = MODEL_MAP[modelName];
    if (!modelType) throw new Error(`Unknown embedding model: ${modelName}`);
    logger.info('Embedder', `Loading: ${modelName}`);
    embedder = await FlagEmbedding.init({ model: modelType });
    currentModelName = modelName;
    logger.info('Embedder', `Ready: ${modelName} (dim: ${EMBEDDING_MODELS[modelName]?.dimensions ?? 384})`);
    return embedder;
  })();

  try {
    return await embedderInitPromise;
  } finally {
    embedderInitPromise = null;
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const emb = await getEmbedder();
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += CHUNK_DEFAULTS.BATCH_SIZE_EMBED) {
    const batch = texts.slice(i, i + CHUNK_DEFAULTS.BATCH_SIZE_EMBED);
    const embeddingsGenerator = emb.embed(batch);
    for await (const batchEmbeddings of embeddingsGenerator) {
      for (const vec of batchEmbeddings) {
        results.push(Array.from(vec));
      }
    }
  }
  return results;
}

export async function embedQuery(text: string): Promise<number[]> {
  const emb = await getEmbedder();
  const result = await emb.queryEmbed(text);
  return Array.from(result);
}

export function getEmbeddingDimension(): number {
  const name = (getSetting('embedding_model') || DEFAULT_SETTINGS.EMBEDDING_MODEL) as ModelName;
  return EMBEDDING_MODELS[name]?.dimensions ?? 384;
}

export function getAvailableEmbeddingModels() {
  return Object.entries(EMBEDDING_MODELS).map(([name, info]) => ({
    name,
    dimensions: info.dimensions,
    size: info.size,
    description: info.description,
  }));
}
