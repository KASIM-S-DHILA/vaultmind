const path = require('path');
const { app } = require('electron');
const { getSetting } = require('../database/settings');

const MODELS_DIR = path.join(app.getPath('userData'), 'models', 'llm');

let llamaModule = null;
let currentModel = null;
let currentModelPath = null;
let idleTimer = null;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function getLlamaModule() {
  if (!llamaModule) {
    const { getLlama } = await import('node-llama-cpp');
    llamaModule = await getLlama({ gpu: getSetting('gpu_layers') > 0 ? 'auto' : false });
  }
  return llamaModule;
}

async function loadLLM() {
  const modelName = getSetting('llm_model');
  const modelPath = path.join(MODELS_DIR, modelName);

  // Already loaded with the same model
  if (currentModel && currentModelPath === modelPath) {
    resetIdleTimer();
    return currentModel;
  }

  // Unload previous model
  if (currentModel) await unloadLLM();

  const fs = require('fs');
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file "${modelName}" not found. Please open Settings (⚙️ icon in the top right) to download this model or switch to another active model.`);
  }

  console.log(`[LLM] Loading model: ${modelName}`);
  const llama = await getLlamaModule();
  const model = await llama.loadModel({ modelPath });

  const contextSize = parseInt(getSetting('llm_context_size') || '4096', 10);
  const gpuLayers = parseInt(getSetting('gpu_layers') || '0', 10);

  currentModel = {
    model,
    context: await model.createContext({ contextSize, ...(gpuLayers > 0 ? { gpuLayers } : {}) }),
    session: null,
  };
  currentModelPath = modelPath;
  console.log(`[LLM] Model loaded: ${modelName} (context: ${contextSize})`);

  resetIdleTimer();
  return currentModel;
}

async function unloadLLM() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  if (currentModel) {
    try {
      await currentModel.context?.dispose();
      await currentModel.model?.dispose();
    } catch (_) {}
    currentModel = null;
    currentModelPath = null;
    console.log('[LLM] Model unloaded');
  }
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    console.log('[LLM] Idle timeout — unloading model to free RAM');
    unloadLLM();
  }, IDLE_TIMEOUT_MS);
}

async function generateStream({ systemPrompt, userMessage, onToken }) {
  const provider = getSetting('llm_provider') || 'local';

  if (provider === 'ollama') {
    const { generateOllamaStream } = require('./ollama');
    return generateOllamaStream({ systemPrompt, userMessage, onToken });
  }

  await loadLLM();
  const { LlamaChatSession } = await import('node-llama-cpp');
  const temperature = parseFloat(getSetting('llm_temperature') || '0.3');

  const session = new LlamaChatSession({
    contextSequence: currentModel.context.getSequence(),
    systemPrompt,
  });

  let buffer = '';
  await session.prompt(userMessage, {
    temperature,
    onTextChunk: (chunk) => {
      buffer += chunk;
      onToken(chunk);
    },
  });

  return buffer;
}

function getModelsDir() { return MODELS_DIR; }

module.exports = { loadLLM, unloadLLM, generateStream, getModelsDir };
