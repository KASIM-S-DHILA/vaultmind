const { processPDF } = require('./pdf-processor');
const { processText } = require('./text-processor');
const { processAudio } = require('./audio-processor');
const { chunkText } = require('./chunker');
const { addChunks } = require('../engine/vector-store');
const { generateSourceSummary } = require('../engine/summarizer');
const { dbRun, dbGet } = require('../database/sqlite');

async function processFile({ id, filePath, fileType, notebookId, sendProgress }) {
  sendProgress({ status: 'processing', progress: 5, message: 'Reading file...' });

  let pages = [];
  let transcript = null;

  if (fileType === 'pdf') {
    sendProgress({ status: 'processing', progress: 10, message: 'Extracting PDF text...' });
    pages = await processPDF(filePath);
  } else if (fileType === 'audio') {
    sendProgress({ status: 'processing', progress: 10, message: 'Transcribing audio... (this may take a while)' });
    transcript = await processAudio(filePath, (pct) => {
      sendProgress({ status: 'processing', progress: 10 + pct * 0.4, message: `Transcribing: ${Math.round(pct)}%` });
    });
    pages = [{ pageNum: 0, text: transcript }];
    dbRun('UPDATE sources SET transcript = ? WHERE id = ?', [transcript, id]);
  } else {
    pages = await processText(filePath);
  }

  // Chunk
  sendProgress({ status: 'processing', progress: 55, message: 'Splitting into chunks...' });
  const filename = require('path').basename(filePath);
  const chunks = chunkText(pages, { sourceId: id, sourceTitle: filename });

  // Generate summary from first 2000 chars
  sendProgress({ status: 'processing', progress: 60, message: 'Generating summary...' });
  const sampleText = pages.slice(0, 3).map(p => p.text).join('\n\n');
  const summary = await generateSourceSummary(id, sampleText);
  dbRun('UPDATE sources SET summary = ? WHERE id = ?', [summary, id]);

  // Embed + store
  sendProgress({ status: 'processing', progress: 70, message: `Embedding ${chunks.length} chunks...` });
  await addChunks(notebookId, chunks);

  dbRun('UPDATE sources SET chunk_count = ?, file_size = ? WHERE id = ?', [
    chunks.length,
    require('fs').statSync(filePath).size,
    id,
  ]);

  sendProgress({ status: 'ready', progress: 100, message: 'Ready' });
}

module.exports = { processFile };
