const { v4: uuidv4 } = require('uuid');
const { getSetting } = require('../database/settings');

function chunkText(pages, { sourceId, sourceTitle }) {
  const chunkSize = parseInt(getSetting('chunk_size') || '500', 10);
  const chunkOverlap = parseInt(getSetting('chunk_overlap') || '50', 10);

  const chunks = [];

  for (const { pageNum, text } of pages) {
    // Split page text into sentences to respect boundaries
    const sentences = splitIntoSentences(text);
    let buffer = '';
    let bufferStart = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (buffer.length + sentence.length > chunkSize && buffer.length > 0) {
        // Emit chunk
        const contextPrefix = `[From "${sourceTitle}"${pageNum > 0 ? `, page ${pageNum}` : ''}] `;
        chunks.push({
          chunkId: uuidv4(),
          sourceId,
          sourceTitle,
          page: pageNum,
          chunkIndex: chunks.length,
          text: contextPrefix + buffer.trim(),
        });

        // Overlap: keep last N characters
        const overlap = buffer.slice(-chunkOverlap);
        buffer = overlap + sentence;
      } else {
        buffer += (buffer ? ' ' : '') + sentence;
      }
    }

    // Emit remaining buffer
    if (buffer.trim().length > 20) {
      const contextPrefix = `[From "${sourceTitle}"${pageNum > 0 ? `, page ${pageNum}` : ''}] `;
      chunks.push({
        chunkId: uuidv4(),
        sourceId,
        sourceTitle,
        page: pageNum,
        chunkIndex: chunks.length,
        text: contextPrefix + buffer.trim(),
      });
    }
  }

  return chunks;
}

function splitIntoSentences(text) {
  // Split on sentence-ending punctuation while keeping the punctuation
  return text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

module.exports = { chunkText };
