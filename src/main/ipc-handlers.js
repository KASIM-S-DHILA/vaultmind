const { ipcMain, dialog } = require('electron');
const path = require('path');
const { db, dbRun, dbGet, dbAll } = require('./database/sqlite');
const { processFile } = require('./processors');
const { searchSimilar } = require('./engine/vector-store');
const { streamChat } = require('./engine/rag-engine');
const { generateNotebookGuide } = require('./engine/summarizer');
const { getSettings, updateSetting, getAllSettings } = require('./database/settings');
const { getAvailableModels, downloadModel, setActiveModel, deleteModel } = require('./setup/model-downloader');
const { getSystemInfo, isSetupComplete, markSetupComplete } = require('./setup/system-check');
const { v4: uuidv4 } = require('uuid');

let mainWindowRef = null;
function setMainWindow(win) { mainWindowRef = win; }

function registerAllHandlers() {

  // ─── DIALOG ──────────────────────────────────────────────────────────────
  ipcMain.handle('dialog:selectFiles', async (_, options) => {
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Add Sources to VaultMind',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Supported Files', extensions: ['pdf', 'txt', 'md', 'mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac'] },
        { name: 'Documents', extensions: ['pdf', 'txt', 'md'] },
        { name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac'] },
      ],
    });
    return result.canceled ? [] : result.filePaths;
  });

  // ─── NOTEBOOKS ───────────────────────────────────────────────────────────
  ipcMain.handle('notebooks:list', async () => {
    return dbAll('SELECT * FROM notebooks ORDER BY updated_at DESC');
  });

  ipcMain.handle('notebooks:create', async (_, title) => {
    const id = uuidv4();
    const now = Date.now();
    dbRun('INSERT INTO notebooks (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, title || 'Untitled Notebook', now, now]);
    return dbGet('SELECT * FROM notebooks WHERE id = ?', [id]);
  });

  ipcMain.handle('notebooks:rename', async (_, id, title) => {
    dbRun('UPDATE notebooks SET title = ?, updated_at = ? WHERE id = ?', [title, Date.now(), id]);
    return dbGet('SELECT * FROM notebooks WHERE id = ?', [id]);
  });

  ipcMain.handle('notebooks:delete', async (_, id) => {
    // Cascade: delete sources, messages, notes
    const sources = dbAll('SELECT id FROM sources WHERE notebook_id = ?', [id]);
    for (const src of sources) {
      const { deleteSourceVectors } = require('./engine/vector-store');
      await deleteSourceVectors(src.id);
    }
    dbRun('DELETE FROM messages WHERE notebook_id = ?', [id]);
    dbRun('DELETE FROM notes WHERE notebook_id = ?', [id]);
    dbRun('DELETE FROM sources WHERE notebook_id = ?', [id]);
    dbRun('DELETE FROM notebooks WHERE id = ?', [id]);
    return { success: true };
  });

  ipcMain.handle('notebooks:getGuide', async (_, id) => {
    const cached = dbGet('SELECT guide_json FROM notebooks WHERE id = ?', [id]);
    if (cached?.guide_json) return JSON.parse(cached.guide_json);
    const guide = await generateNotebookGuide(id);
    dbRun('UPDATE notebooks SET guide_json = ? WHERE id = ?', [JSON.stringify(guide), id]);
    return guide;
  });

  // ─── SOURCES ─────────────────────────────────────────────────────────────
  ipcMain.handle('sources:list', async (_, notebookId) => {
    return dbAll('SELECT * FROM sources WHERE notebook_id = ? ORDER BY created_at DESC', [notebookId]);
  });

  ipcMain.handle('sources:upload', async (event, notebookId, filePaths) => {
    const results = [];
    for (const filePath of filePaths) {
      const id = uuidv4();
      const filename = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase().slice(1);
      const fileType = ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac'].includes(ext) ? 'audio' : ext;
      const now = Date.now();

      dbRun(
        'INSERT INTO sources (id, notebook_id, filename, file_type, status, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, notebookId, filename, fileType, 'processing', filePath, now]
      );

      results.push({ id, filename, fileType, status: 'processing' });

      // Process in background
      setImmediate(async () => {
        try {
          const sendProgress = (data) => {
            event.sender.send('sources:progress', { sourceId: id, ...data });
          };
          await processFile({ id, filePath, fileType, notebookId, sendProgress });
          dbRun('UPDATE sources SET status = ?, updated_at = ? WHERE id = ?', ['ready', Date.now(), id]);
          // Invalidate notebook guide cache
          dbRun('UPDATE notebooks SET guide_json = NULL, updated_at = ? WHERE id = ?', [Date.now(), notebookId]);
          event.sender.send('sources:progress', { sourceId: id, status: 'ready', progress: 100 });
        } catch (err) {
          dbRun('UPDATE sources SET status = ?, error_message = ? WHERE id = ?', ['error', err.message, id]);
          event.sender.send('sources:progress', { sourceId: id, status: 'error', error: err.message });
        }
      });
    }
    return results;
  });

  ipcMain.handle('sources:delete', async (_, sourceId) => {
    const { deleteSourceVectors } = require('./engine/vector-store');
    await deleteSourceVectors(sourceId);
    const src = dbGet('SELECT notebook_id FROM sources WHERE id = ?', [sourceId]);
    dbRun('DELETE FROM sources WHERE id = ?', [sourceId]);
    if (src) dbRun('UPDATE notebooks SET guide_json = NULL WHERE id = ?', [src.notebook_id]);
    return { success: true };
  });

  ipcMain.handle('sources:getContent', async (_, sourceId) => {
    return dbGet('SELECT filename, file_type, transcript, summary FROM sources WHERE id = ?', [sourceId]);
  });

  // ─── CHAT ─────────────────────────────────────────────────────────────────
  ipcMain.handle('chat:send', async (event, notebookId, message) => {
    const msgId = uuidv4();
    const now = Date.now();

    // Save user message
    dbRun('INSERT INTO messages (id, notebook_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), notebookId, 'user', message, now]);

    // Stream response
    let fullResponse = '';
    let citations = [];

    await streamChat({
      notebookId,
      message,
      onToken: (token) => {
        fullResponse += token;
        event.sender.send('chat:token', token);
      },
      onCitations: (c) => { citations = c; },
    });

    // Save assistant message
    dbRun(
      'INSERT INTO messages (id, notebook_id, role, content, citations_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [msgId, notebookId, 'assistant', fullResponse, JSON.stringify(citations), Date.now()]
    );

    // Update notebook timestamp
    dbRun('UPDATE notebooks SET updated_at = ? WHERE id = ?', [Date.now(), notebookId]);

    return { id: msgId, content: fullResponse, citations };
  });

  ipcMain.handle('chat:history', async (_, notebookId) => {
    const rows = dbAll('SELECT * FROM messages WHERE notebook_id = ? ORDER BY created_at ASC', [notebookId]);
    return rows.map(r => ({ ...r, citations: r.citations_json ? JSON.parse(r.citations_json) : [] }));
  });

  ipcMain.handle('chat:clear', async (_, notebookId) => {
    dbRun('DELETE FROM messages WHERE notebook_id = ?', [notebookId]);
    return { success: true };
  });

  // ─── NOTES ────────────────────────────────────────────────────────────────
  ipcMain.handle('notes:get', async (_, notebookId) => {
    return dbGet('SELECT content FROM notes WHERE notebook_id = ?', [notebookId]);
  });

  ipcMain.handle('notes:save', async (_, notebookId, content) => {
    const existing = dbGet('SELECT id FROM notes WHERE notebook_id = ?', [notebookId]);
    if (existing) {
      dbRun('UPDATE notes SET content = ?, updated_at = ? WHERE notebook_id = ?', [content, Date.now(), notebookId]);
    } else {
      dbRun('INSERT INTO notes (id, notebook_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), notebookId, content, Date.now(), Date.now()]);
    }
    return { success: true };
  });

  // ─── SETTINGS + MODEL MANAGEMENT ─────────────────────────────────────────
  ipcMain.handle('settings:get', async () => getAllSettings());

  ipcMain.handle('settings:update', async (_, key, value) => {
    updateSetting(key, value);
    return { success: true };
  });

  ipcMain.handle('settings:getAvailableModels', async () => getAvailableModels());

  ipcMain.handle('settings:downloadModel', async (event, url, type) => {
    return downloadModel(url, type, (progress) => {
      event.sender.send('model:downloadProgress', progress);
    });
  });

  ipcMain.handle('settings:setActiveModel', async (_, type, modelName) => {
    setActiveModel(type, modelName);
    // Unload current model so it reloads on next use
    if (type === 'llm') {
      const { unloadLLM } = require('./engine/llm');
      await unloadLLM();
    }
    return { success: true };
  });

  ipcMain.handle('settings:deleteModel', async (_, type, modelName) => {
    return deleteModel(type, modelName);
  });

  ipcMain.handle('settings:listOllamaModels', async () => {
    const { listOllamaModels } = require('./engine/ollama');
    return listOllamaModels();
  });

  ipcMain.handle('settings:systemInfo', async () => getSystemInfo());

  // ─── SETUP WIZARD ─────────────────────────────────────────────────────────
  ipcMain.handle('setup:isComplete', async () => isSetupComplete());
  ipcMain.handle('setup:systemInfo', async () => getSystemInfo());

  ipcMain.handle('setup:downloadModel', async (event, type) => {
    const defaults = {
      llm: {
        url: 'https://huggingface.co/bartowski/microsoft_Phi-4-mini-instruct-GGUF/resolve/main/microsoft_Phi-4-mini-instruct-Q4_K_M.gguf',
        name: 'Phi-4-mini-Q4_K_M.gguf',
      },
      whisper: {
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
        name: 'ggml-base.bin',
      },
    };
    const model = defaults[type];
    if (!model) throw new Error(`Unknown model type: ${type}`);
    return downloadModel(model.url, type, (progress) => {
      event.sender.send('model:downloadProgress', { type, ...progress });
    }, model.name);
  });

  ipcMain.handle('setup:complete', async () => {
    markSetupComplete();
    return { success: true };
  });
}

module.exports = { registerAllHandlers, setMainWindow };
