export interface Settings {
  ollama_url: string;
  ollama_model: string;
  embedding_model: string;
  llm_temperature: string;
  retrieval_top_k: string;
  chunk_size: string;
  chunk_overlap: string;
}

export interface DownloadProgress {
  percent: number;
  status: string;
  message?: string;
}

export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

export interface SystemInfo {
  cpu: { model: string; cores: number };
  ram: { totalGB: number; freeGB: number };
  gpu?: { detected: boolean };
  ollamaInstalled: boolean;
  ollamaVersion: string | null;
  recommendedLLM: string;
  recommendedNote?: string;
  platform: string;
  arch?: string;
  dataDir?: string;
}

export interface OllamaCheckResult {
  installed: boolean;
  version: string | null;
}
