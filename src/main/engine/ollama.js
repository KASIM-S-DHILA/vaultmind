const { getSetting } = require('../database/settings');

async function getOllamaUrl() {
  return getSetting('ollama_url') || 'http://127.0.0.1:11434';
}

async function listOllamaModels() {
  const url = await getOllamaUrl();
  try {
    const res = await fetch(`${url}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.models || [];
  } catch (err) {
    console.warn('[Ollama] Failed to connect to server:', err.message);
    return [];
  }
}

async function generateOllamaStream({ systemPrompt, userMessage, onToken }) {
  const baseUrl = await getOllamaUrl();
  const model = getSetting('ollama_model') || 'phi4:latest';
  const temperature = parseFloat(getSetting('llm_temperature') || '0.3');

  console.log(`[Ollama] Generating stream with model: ${model} on ${baseUrl}`);

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      stream: true,
      options: { temperature }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error: ${res.statusText} (${errText})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const token = parsed.message?.content || '';
          if (token) {
            buffer += token;
            onToken(token);
          }
        } catch (_) {
          // Incomplete JSON chunk, skip and wait for complete line
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return buffer;
}

module.exports = { listOllamaModels, generateOllamaStream };
