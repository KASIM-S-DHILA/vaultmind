const os = require('os');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { getSetting, updateSetting } = require('../database/settings');

function getSystemInfo() {
  const totalRAMGB = os.totalmem() / (1024 ** 3);
  const freeRAMGB = os.freemem() / (1024 ** 3);
  const cpuCores = os.cpus().length;
  const cpuModel = os.cpus()[0]?.model || 'Unknown CPU';
  const platform = os.platform();
  const arch = os.arch();

  // GPU detection (basic — checks for CUDA/ROCm environment)
  let hasGPU = false;
  try {
    const { execSync } = require('child_process');
    execSync('nvidia-smi', { stdio: 'pipe', timeout: 2000 });
    hasGPU = true;
  } catch (_) {}

  // Model recommendation based on RAM
  let recommendedLLM = 'Phi-4-mini-Q4_K_M.gguf';
  let recommendedNote = '';
  if (totalRAMGB < 6) {
    recommendedLLM = 'Llama-3.2-3B-Q4_K_M.gguf';
    recommendedNote = 'Low RAM detected. Recommending the lighter 3B model.';
  } else if (totalRAMGB >= 16) {
    recommendedNote = 'Your system has plenty of RAM. You can run larger models if desired.';
  }

  return {
    ram: { totalGB: Math.round(totalRAMGB * 10) / 10, freeGB: Math.round(freeRAMGB * 10) / 10 },
    cpu: { model: cpuModel, cores: cpuCores },
    gpu: { detected: hasGPU },
    platform,
    arch,
    recommendedLLM,
    recommendedNote,
    dataDir: app.getPath('userData'),
  };
}

function isSetupComplete() {
  return getSetting('setup_complete') === 'true';
}

function markSetupComplete() {
  updateSetting('setup_complete', 'true');
}

module.exports = { getSystemInfo, isSetupComplete, markSetupComplete };
