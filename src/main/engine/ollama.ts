import { spawn, execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { downloadFile } from '../setup/model-downloader';
import { getSetting } from '../database/settings';
import { logger } from '../../shared/logger';
import { OLLAMA_POLL_INTERVAL, OLLAMA_STARTUP_TIMEOUT } from '../../shared/constants';
import type { OllamaModelInfo, OllamaCheckResult } from '../../shared/types';

const STARTUP_SHORTCUT_NAME = 'VaultMind - Ollama Server.lnk';

let ollamaProcess: ReturnType<typeof spawn> | null = null;

async function getOllamaUrl(): Promise<string> {
  return getSetting('ollama_url') || 'http://127.0.0.1:11434';
}

export async function startOllamaServer(): Promise<void> {
  if (ollamaProcess) return;
  try {
    const res = await fetch((await getOllamaUrl()) + '/api/tags');
    if (res.ok) {
      logger.info('Ollama', 'Server already running');
      return;
    }
  } catch {
    // Server not running — proceed to start
  }

  logger.info('Ollama', 'Starting server...');
  ollamaProcess = spawn('ollama', ['serve'], { stdio: 'ignore', detached: true, windowsHide: true });
  ollamaProcess.on('error', (err) => {
    logger.warn('Ollama', 'Failed to start server:', err.message);
    ollamaProcess = null;
  });
  ollamaProcess.on('exit', (code) => {
    logger.info('Ollama', 'Server exited with code', code);
    ollamaProcess = null;
  });
}

export async function waitForOllamaReady(timeoutMs = OLLAMA_STARTUP_TIMEOUT): Promise<boolean> {
  const url = await getOllamaUrl();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url + '/api/tags');
      if (res.ok) {
        logger.info('Ollama', 'Server ready');
        return true;
      }
    } catch {
      // Not ready yet
    }
    await new Promise(r => setTimeout(r, OLLAMA_POLL_INTERVAL));
  }
  logger.warn('Ollama', 'Server did not become ready within timeout');
  return false;
}

export function stopOllamaServer(): void {
  if (ollamaProcess) {
    ollamaProcess.kill();
    ollamaProcess = null;
  }
}

export function checkOllamaInstalled(): OllamaCheckResult {
  try {
    const out = execSync('ollama --version', { stdio: 'pipe', timeout: 5000, encoding: 'utf-8', windowsHide: true });
    return { installed: true, version: out.trim() };
  } catch {
    return { installed: false, version: null };
  }
}

export async function checkOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch((await getOllamaUrl()) + '/api/tags');
    return res.ok;
  } catch {
    return false;
  }
}

export async function pullModel(
  modelName: string,
  onProgress: (progress: { percent: number; status: string; message: string }) => void,
): Promise<{ success: boolean; model: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ollama', ['pull', modelName], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });

    proc.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        const progressMatch = line.match(/(\d+)%/);
        if (progressMatch) {
          onProgress({ percent: parseInt(progressMatch[1]), status: 'pulling', message: line.trim() });
        }
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('already')) {
        onProgress({ percent: 0, status: 'info', message: msg });
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress({ percent: 100, status: 'done', message: `Model ${modelName} ready` });
        resolve({ success: true, model: modelName });
      } else {
        reject(new Error(`ollama pull failed with code: ${code}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

export async function listOllamaModels(): Promise<OllamaModelInfo[]> {
  const url = await getOllamaUrl();
  try {
    const res = await fetch(url + '/api/tags');
    if (!res.ok) return [];
    const data = await res.json();
    return data.models || [];
  } catch (err) {
    logger.warn('Ollama', 'Failed to connect to server:', (err as Error).message);
    return [];
  }
}

const OLLAMA_DOWNLOAD_URL = 'https://ollama.com/download/OllamaSetup.exe';

export async function downloadAndInstallOllama(
  onProgress: (progress: { percent: number; status: string; message: string }) => void,
): Promise<void> {
  const destDir = path.join(app.getPath('temp'), 'vaultmind-ollama');
  const installerPath = path.join(destDir, 'OllamaSetup.exe');

  onProgress({ percent: 0, status: 'downloading', message: 'Downloading Ollama...' });
  await downloadFile(OLLAMA_DOWNLOAD_URL, installerPath, (p) => {
    onProgress({ percent: Math.floor(p.percent * 0.8), status: 'downloading', message: `Downloading Ollama... ${p.percent}%` });
  });

  onProgress({ percent: 80, status: 'installing', message: 'Installing Ollama...' });
  await new Promise<void>((resolve, reject) => {
    const proc = exec(`"${installerPath}" /verysilent /norestart`, { windowsHide: true }, (err) => {
      if (err) reject(err);
      else resolve();
    });
    proc.on('error', reject);
  });

  onProgress({ percent: 90, status: 'starting', message: 'Starting Ollama server...' });
  await startOllamaServer();
  const ready = await waitForOllamaReady(30000);
  if (!ready) throw new Error('Ollama server did not start');
  onProgress({ percent: 100, status: 'done', message: 'Ollama ready!' });
}

export async function warmupModel(modelName: string): Promise<void> {
  const baseUrl = await getOllamaUrl();
  const res = await fetch(baseUrl + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: 'hi' }],
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Model warmup failed: ${res.status}`);
  }
}

function findOllamaExePath(): string | null {
  try {
    const out = execSync('where ollama', { stdio: 'pipe', timeout: 5000, encoding: 'utf-8', windowsHide: true });
    const p = out.trim().split('\n')[0];
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return null;
}

export function setOllamaAutoStart(enabled: boolean): boolean {
  const startupDir = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  const shortcutPath = path.join(startupDir, STARTUP_SHORTCUT_NAME);
  try {
    if (!fs.existsSync(startupDir)) {
      fs.mkdirSync(startupDir, { recursive: true });
    }
    if (enabled) {
      const exePath = findOllamaExePath();
      if (!exePath) return false;
      const psScript = `$ws=New-Object -ComObject WScript.Shell;$s=$ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');$s.TargetPath='${exePath.replace(/'/g, "''")}';$s.Arguments='serve';$s.WorkingDirectory='${path.dirname(exePath).replace(/'/g, "''")}';$s.Description='Ollama AI server (started by VaultMind)';$s.WindowStyle=7;$s.Save()`;
      execSync(psScript, { stdio: 'pipe', timeout: 10000, windowsHide: true, shell: 'powershell' });
    } else {
      if (fs.existsSync(shortcutPath)) fs.unlinkSync(shortcutPath);
    }
    return true;
  } catch (err) {
    logger.warn('Ollama', 'Failed to set auto-start:', (err as Error).message);
    return false;
  }
}

export function getOllamaAutoStart(): boolean {
  const startupDir = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  return fs.existsSync(path.join(startupDir, STARTUP_SHORTCUT_NAME));
}

export async function generateOllamaStream(options: {
  systemPrompt: string;
  userMessage: string;
  onToken: (token: string) => void;
}): Promise<string> {
  const { systemPrompt, userMessage, onToken } = options;
  const baseUrl = await getOllamaUrl();
  const model = getSetting('ollama_model') || 'phi4:latest';
  const temperature = parseFloat(getSetting('llm_temperature') || '0.3');

  logger.info('Ollama', `Generating stream with model: ${model} on ${baseUrl}`);

  const res = await fetch(baseUrl + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      options: { temperature },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error: ${res.status} ${errText.slice(0, 200)}`);
  }

  const reader = res.body!.getReader();
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
          const token: string = parsed.message?.content || '';
          if (token) {
            buffer += token;
            onToken(token);
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return buffer;
}
