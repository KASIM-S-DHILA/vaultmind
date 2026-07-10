const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { getSetting } = require('../database/settings');

const WHISPER_MODELS_DIR = path.join(app.getPath('userData'), 'models', 'whisper');

let whisperModule = null;

async function getWhisper() {
  if (whisperModule) return whisperModule;

  try {
    // Try whisper-addon (whisper.cpp Node.js bindings)
    whisperModule = require('whisper-addon');
    return whisperModule;
  } catch (_) {
    // Fallback: try @nicepkg/whisper-node
    try {
      const { whisper } = require('@nicepkg/whisper-node');
      whisperModule = { transcribe: whisper };
      return whisperModule;
    } catch (err) {
      throw new Error(`Whisper module not available: ${err.message}. Audio files cannot be transcribed.`);
    }
  }
}

async function processAudio(filePath, onProgress) {
  const modelName = getSetting('whisper_model') || 'ggml-base.bin';
  const modelPath = path.join(WHISPER_MODELS_DIR, modelName);

  if (!fs.existsSync(modelPath)) {
    throw new Error(`Whisper model not found: ${modelName}. Please download it in Settings.`);
  }

  // Convert to wav if needed (whisper.cpp requires WAV 16kHz mono)
  const ext = path.extname(filePath).toLowerCase();
  let wavPath = filePath;

  if (ext !== '.wav') {
    wavPath = await convertToWav(filePath, onProgress);
  } else {
    onProgress && onProgress(20);
  }

  onProgress && onProgress(30);

  const whisper = await getWhisper();

  return new Promise((resolve, reject) => {
    try {
      // whisper-addon API
      const result = whisper.transcribe({
        model: modelPath,
        fname_inp: wavPath,
        language: 'auto',
        n_threads: Math.min(4, require('os').cpus().length),
        use_vad: true, // skip silence
        print_progress: false,
      });

      onProgress && onProgress(90);

      // Clean up temp wav if we created it
      if (wavPath !== filePath) {
        try { fs.unlinkSync(wavPath); } catch (_) {}
      }

      // Format transcript with timestamps if available
      const transcript = Array.isArray(result)
        ? result.map(seg => `[${formatTime(seg.start)}] ${seg.text.trim()}`).join('\n')
        : String(result).trim();

      resolve(transcript);
    } catch (err) {
      reject(new Error(`Transcription failed: ${err.message}`));
    }
  });
}

async function convertToWav(inputPath, onProgress) {
  // Use fluent-ffmpeg if available, otherwise shell out to ffmpeg
  const { execFileSync } = require('child_process');
  const os = require('os');
  const outputPath = path.join(os.tmpdir(), `vm_audio_${Date.now()}.wav`);

  onProgress && onProgress(10);

  try {
    // Try system ffmpeg
    execFileSync('ffmpeg', [
      '-i', inputPath,
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      '-y', outputPath,
    ], { timeout: 60000, stdio: 'pipe' });
  } catch (err) {
    throw new Error(`Audio conversion failed. Please ensure ffmpeg is installed, or upload WAV files directly. Error: ${err.message}`);
  }

  onProgress && onProgress(20);
  return outputPath;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getAvailableWhisperModels() {
  return [
    { name: 'ggml-tiny.bin', size: '~39 MB', speed: 'Fastest (10x+ real-time)', accuracy: 'Basic', recommended: false },
    { name: 'ggml-base.bin', size: '~140 MB', speed: 'Very Fast (5-8x real-time)', accuracy: 'Good', recommended: true },
    { name: 'ggml-small.bin', size: '~466 MB', speed: 'Fast (2-4x real-time)', accuracy: 'Better', recommended: false },
    { name: 'ggml-medium.bin', size: '~1.5 GB', speed: 'Moderate', accuracy: 'Best', recommended: false },
  ];
}

module.exports = { processAudio, getAvailableWhisperModels };
