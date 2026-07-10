const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { app } = require('electron');
const { getSetting, updateSetting } = require('../database/settings');

const MODELS_BASE = path.join(app.getPath('userData'), 'models');
const LLM_DIR = path.join(MODELS_BASE, 'llm');
const WHISPER_DIR = path.join(MODELS_BASE, 'whisper');

const PRESET_MODELS = {
  llm: [
    {
      name: 'Phi-4-mini-Q4_K_M.gguf',
      displayName: 'Phi-4 Mini (Recommended)',
      url: 'https://huggingface.co/bartowski/microsoft_Phi-4-mini-instruct-GGUF/resolve/main/microsoft_Phi-4-mini-instruct-Q4_K_M.gguf',
      size: '~2.3 GB',
      ram: '~3 GB',
      description: 'Best quality/size ratio for 8GB laptops. Excellent reasoning.',
      recommended: true,
    },
    {
      name: 'Llama-3.2-3B-Q4_K_M.gguf',
      displayName: 'Llama 3.2 3B',
      url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
      size: '~1.9 GB',
      ram: '~2.5 GB',
      description: 'Lighter option — great if RAM is tight.',
    },
    {
      name: 'qwen2.5-3b-instruct-q4_k_m.gguf',
      displayName: 'Qwen 2.5 3B',
      url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
      size: '~2.0 GB',
      ram: '~2.8 GB',
      description: 'Strong reasoning and multilingual support.',
    },
  ],
  whisper: [
    {
      name: 'ggml-tiny.bin',
      displayName: 'Whisper Tiny',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
      size: '~39 MB',
      description: 'Fastest — basic accuracy.',
    },
    {
      name: 'ggml-base.bin',
      displayName: 'Whisper Base (Recommended)',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
      size: '~140 MB',
      description: 'Best balance of speed and accuracy for audio.',
      recommended: true,
    },
    {
      name: 'ggml-small.bin',
      displayName: 'Whisper Small',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
      size: '~466 MB',
      description: 'Higher accuracy for complex audio.',
    },
  ],
};

function ensureDirs() {
  fs.mkdirSync(LLM_DIR, { recursive: true });
  fs.mkdirSync(WHISPER_DIR, { recursive: true });
}

function getModelDir(type) {
  return type === 'llm' ? LLM_DIR : WHISPER_DIR;
}

function getAvailableModels() {
  ensureDirs();
  const result = {};

  for (const type of ['llm', 'whisper']) {
    const dir = getModelDir(type);
    const downloaded = fs.readdirSync(dir).filter(f => f.endsWith('.gguf') || f.endsWith('.bin'));
    const presets = PRESET_MODELS[type];
    const activeModel = getSetting(`${type}_model`);

    result[type] = presets.map(preset => ({
      ...preset,
      downloaded: downloaded.includes(preset.name),
      active: activeModel === preset.name,
    }));

    // Add any custom downloaded models not in presets
    const presetNames = new Set(presets.map(p => p.name));
    for (const name of downloaded) {
      if (!presetNames.has(name)) {
        result[type].push({
          name,
          displayName: name,
          size: formatBytes(fs.statSync(path.join(dir, name)).size),
          downloaded: true,
          active: activeModel === name,
          custom: true,
        });
      }
    }
  }

  return result;
}

function downloadModel(url, type, onProgress, modelName) {
  ensureDirs();
  const dir = getModelDir(type);

  // Derive filename from URL or use provided name
  const filename = modelName || decodeURIComponent(url.split('/').pop().split('?')[0]);
  const destPath = path.join(dir, filename);

  // Already downloaded
  if (fs.existsSync(destPath)) {
    onProgress({ percent: 100, downloaded: fs.statSync(destPath).size, total: fs.statSync(destPath).size });
    return Promise.resolve({ success: true, path: destPath, name: filename });
  }

  return new Promise((resolve, reject) => {
    const tmpPath = destPath + '.download';
    const file = fs.createWriteStream(tmpPath);
    let downloaded = 0;
    let total = 0;

    const protocol = url.startsWith('https') ? https : http;

    function makeRequest(requestUrl, redirectCount = 0) {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));

      protocol.get(requestUrl, { headers: { 'User-Agent': 'VaultMind/1.0' } }, (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          const redirectUrl = res.headers.location;
          const newProtocol = redirectUrl.startsWith('https') ? https : http;
          // Switch protocol object if needed
          return makeRequest(redirectUrl, redirectCount + 1);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }

        total = parseInt(res.headers['content-length'] || '0', 10);

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            onProgress({
              percent: Math.round((downloaded / total) * 100),
              downloaded,
              total,
              speed: 0, // Could calculate with timestamps
            });
          }
        });

        res.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            fs.renameSync(tmpPath, destPath);
            resolve({ success: true, path: destPath, name: filename });
          });
        });
      }).on('error', (err) => {
        fs.unlink(tmpPath, () => {});
        reject(err);
      });
    }

    makeRequest(url);
  });
}

function setActiveModel(type, modelName) {
  updateSetting(`${type}_model`, modelName);
  console.log(`[Models] Active ${type} model set to: ${modelName}`);
}

function deleteModel(type, modelName) {
  const dir = getModelDir(type);
  const modelPath = path.join(dir, modelName);

  if (!fs.existsSync(modelPath)) {
    return { success: false, error: 'Model not found' };
  }

  // Don't delete the currently active model
  const active = getSetting(`${type}_model`);
  if (active === modelName) {
    return { success: false, error: 'Cannot delete the currently active model. Switch to another model first.' };
  }

  fs.unlinkSync(modelPath);
  return { success: true };
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

module.exports = { getAvailableModels, downloadModel, setActiveModel, deleteModel, PRESET_MODELS };
