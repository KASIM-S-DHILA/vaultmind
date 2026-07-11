import { generateOllamaStream } from './ollama';
import { logger } from '../../shared/logger';

interface GenerateOptions {
  systemPrompt: string;
  userMessage: string;
  onToken: (token: string) => void;
  signal?: AbortSignal;
}

export async function generateStream(options: GenerateOptions): Promise<string> {
  logger.info('LLM', `Generating stream (prompt length: ${options.systemPrompt.length})`);
  return generateOllamaStream(options);
}
