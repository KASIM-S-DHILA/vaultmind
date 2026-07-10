export const DEFAULT_SETTINGS = {
  OLLAMA_URL: 'http://127.0.0.1:11434',
  OLLAMA_MODEL: 'phi4:latest',
  EMBEDDING_MODEL: 'nomic-embed-text-v1.5',
  LLM_TEMPERATURE: '0.3',
  RETRIEVAL_TOP_K: '5',
  CHUNK_SIZE: '500',
  CHUNK_OVERLAP: '50',
} as const;

export const OLLAMA_PRESETS = [
  { name: 'phi4:latest', display: 'Phi-4 (14B)', desc: 'Microsoft — excellent reasoning, best for analysis' },
  { name: 'llama3.2:3b', display: 'Llama 3.2 (3B)', desc: 'Meta — lightweight, fast on 8GB RAM' },
  { name: 'qwen2.5:7b', display: 'Qwen 2.5 (7B)', desc: 'Alibaba — strong multilingual support' },
  { name: 'mistral:7b', display: 'Mistral (7B)', desc: 'Mistral AI — fast & efficient' },
  { name: 'llama3.2:latest', display: 'Llama 3.2 (11B)', desc: 'Meta — best quality, needs 16GB+ RAM' },
] as const;

export const EMBEDDING_MODELS = {
  'all-MiniLM-L6-v2': { dimensions: 384, size: '~25 MB', description: 'Fast & lightweight — recommended for 8GB RAM' },
  'nomic-embed-text-v1.5': { dimensions: 768, size: '~270 MB', description: 'Higher quality retrieval — best for large documents' },
  'bge-small-en-v1.5': { dimensions: 384, size: '~25 MB', description: 'Balanced performance' },
} as const;

export const SUPPORTED_FILE_EXTENSIONS = ['pdf', 'txt', 'md', 'csv'] as const;

export const CHUNK_DEFAULTS = {
  SIZE: 500,
  OVERLAP: 50,
  BATCH_SIZE_EMBED: 32,
} as const;

export const OLLAMA_POLL_INTERVAL = 500;
export const OLLAMA_STARTUP_TIMEOUT = 30000;

export const SQLITE_PATH = 'data/vaultmind.db';
export const VECTOR_DB_DIR = 'data/vectors';

export const WINDOW_DEFAULTS = {
  WIDTH: 1400,
  HEIGHT: 900,
  MIN_WIDTH: 900,
  MIN_HEIGHT: 600,
} as const;

export { IPC } from './types/ipc';
