import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEmbed = vi.fn();
const mockQueryEmbed = vi.fn();
const mockInit = vi.fn();

vi.mock('fastembed', () => ({
  FlagEmbedding: {
    init: mockInit,
  },
  EmbeddingModel: {
    AllMiniLML6V2: 'all-MiniLM-L6-v2',
    BGEBaseENV15: 'BGEBaseENV15',
    BGESmallENV15: 'BGESmallENV15',
  },
}));

vi.mock('../main/database/settings', () => ({
  getSetting: vi.fn().mockReturnValue('all-MiniLM-L6-v2'),
}));

vi.mock('../../shared/constants', () => ({
  DEFAULT_SETTINGS: { EMBEDDING_MODEL: 'all-MiniLM-L6-v2' },
  EMBEDDING_MODELS: {
    'all-MiniLM-L6-v2': { dimensions: 384, size: '~25 MB', description: 'Fast' },
    'nomic-embed-text-v1.5': { dimensions: 768, size: '~270 MB', description: 'High quality' },
    'bge-small-en-v1.5': { dimensions: 384, size: '~25 MB', description: 'Balanced' },
  },
  CHUNK_DEFAULTS: { BATCH_SIZE_EMBED: 32 },
}));

const { embedTexts } = await import('../main/engine/embedder');

function createGenerator(batchSize: number) {
  return (async function* () {
    const vectors = Array.from({ length: batchSize }, () => new Float32Array([0.1, 0.2]));
    yield vectors;
  })();
}

describe('embedder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockInstance = { embed: mockEmbed, queryEmbed: mockQueryEmbed };
    mockInit.mockResolvedValue(mockInstance);
    mockEmbed.mockImplementation((batch: string[]) => createGenerator(batch.length));
  });

  it('embedTexts returns a result per input text', async () => {
    const texts = Array.from({ length: 5 }, (_, i) => `text ${i}`);
    const results = await embedTexts(texts);
    expect(results).toHaveLength(5);
  });

  it('embedTexts handles single batch (< BATCH_SIZE_EMBED)', async () => {
    const texts = Array.from({ length: 10 }, (_, i) => `text ${i}`);
    const results = await embedTexts(texts);
    expect(results).toHaveLength(10);
    expect(results[0]).toHaveLength(2);
    expect(results[0][0]).toBeCloseTo(0.1, 1);
    expect(results[0][1]).toBeCloseTo(0.2, 1);
  });

  it('embedTexts returns empty array for empty input', async () => {
    const results = await embedTexts([]);
    expect(results).toEqual([]);
  });

  it('getEmbeddingDimension returns correct dimension', async () => {
    const { getEmbeddingDimension } = await import('../main/engine/embedder');
    const dim = getEmbeddingDimension();
    expect(dim).toBe(384);
  });
});
