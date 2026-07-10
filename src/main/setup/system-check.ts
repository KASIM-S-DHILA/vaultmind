import os from 'os';
import { app } from 'electron';
import { execSync } from 'child_process';
import { getSetting, updateSetting } from '../database/settings';
import type { SystemInfo } from '../../shared/types';

export function getSystemInfo(): SystemInfo {
  const totalRAMGB = os.totalmem() / (1024 ** 3);
  const freeRAMGB = os.freemem() / (1024 ** 3);
  const cpuCores = os.cpus().length;
  const cpuModel = os.cpus()[0]?.model || 'Unknown CPU';
  const platform = os.platform();

  let hasGPU = false;
  try {
    execSync('nvidia-smi', { stdio: 'pipe', timeout: 2000, windowsHide: true });
    hasGPU = true;
  } catch {
    // No GPU or nvidia-smi not available
  }

  let ollamaInstalled = false;
  let ollamaVersion: string | null = null;
  try {
    const out = execSync('ollama --version', { stdio: 'pipe', timeout: 5000, encoding: 'utf-8', windowsHide: true });
    ollamaInstalled = true;
    ollamaVersion = out.trim();
  } catch {
    // Ollama not installed
  }

  let recommendedLLM = 'phi4:latest';
  let recommendedNote = '';
  if (totalRAMGB < 6) {
    recommendedLLM = 'llama3.2:3b';
    recommendedNote = 'Low RAM detected. Recommending the lighter 3B model.';
  } else if (totalRAMGB >= 16) {
    recommendedNote = 'Your system has plenty of RAM. You can run larger models if desired.';
  }
  if (!ollamaInstalled) {
    recommendedNote = 'Ollama is not installed. Install from https://ollama.com to use AI models.';
  }

  return {
    ram: { totalGB: Math.round(totalRAMGB * 10) / 10, freeGB: Math.round(freeRAMGB * 10) / 10 },
    cpu: { model: cpuModel, cores: cpuCores },
    gpu: { detected: hasGPU },
    platform,
    recommendedLLM,
    recommendedNote,
    ollamaInstalled,
    ollamaVersion,
  };
}

export function isSetupComplete(): boolean {
  return getSetting('setup_complete') === 'true';
}

export function markSetupComplete(): void {
  updateSetting('setup_complete', 'true');
}
