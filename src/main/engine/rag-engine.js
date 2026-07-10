const { searchSimilar } = require('./vector-store');
const { generateStream } = require('./llm');
const { getSetting } = require('../database/settings');
const { dbAll } = require('../database/sqlite');

const SYSTEM_PROMPT = `You are VaultMind, a confidential legal research assistant. Your role is to analyze and synthesize information from the provided source documents.

RULES:
1. Answer ONLY based on the provided source documents. Never use external knowledge.
2. Always cite your sources using inline markers like [1], [2], etc.
3. If the answer is not in the provided sources, clearly state: "This information was not found in the provided documents."
4. Be precise, factual, and professional — as expected in a legal context.
5. When quoting or paraphrasing, indicate which source the information comes from.
6. Do not speculate or infer beyond what is explicitly stated in the documents.

CONTEXT:
{context}`;

async function streamChat({ notebookId, message, onToken, onCitations }) {
  // 1. Retrieve relevant chunks
  const chunks = await searchSimilar(notebookId, message);

  if (chunks.length === 0) {
    const noSourceMsg = "No relevant information was found in the uploaded documents. Please upload relevant source files and try again.";
    onToken(noSourceMsg);
    onCitations([]);
    return noSourceMsg;
  }

  // 2. Build context with citation markers
  const citationMap = [];
  const contextLines = chunks.map((chunk, i) => {
    const label = i + 1;
    citationMap.push({
      label,
      sourceId: chunk.sourceId,
      sourceTitle: chunk.sourceTitle,
      chunkText: chunk.text,
      page: chunk.page,
    });
    const pageInfo = chunk.page > 0 ? ` (page ${chunk.page})` : '';
    return `[${label}] From "${chunk.sourceTitle}"${pageInfo}:\n${chunk.text}`;
  }).join('\n\n---\n\n');

  // 3. Build system prompt
  const systemPrompt = SYSTEM_PROMPT.replace('{context}', contextLines);

  // 4. Stream from LLM
  let fullResponse = '';
  await generateStream({
    systemPrompt,
    userMessage: message,
    onToken: (token) => {
      fullResponse += token;
      onToken(token);
    },
  });

  // 5. Parse which citations were actually used in response
  const usedCitations = citationMap.filter(c => {
    const pattern = new RegExp(`\\[${c.label}\\]`);
    return pattern.test(fullResponse);
  });

  onCitations(usedCitations);
  return fullResponse;
}

module.exports = { streamChat };
