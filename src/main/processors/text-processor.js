const fs = require('fs');

async function processText(filePath) {
  const ext = require('path').extname(filePath).toLowerCase();
  let content = fs.readFileSync(filePath, 'utf-8');

  // Basic Markdown cleanup
  if (ext === '.md') {
    content = content
      .replace(/#{1,6}\s+/g, '') // Remove heading markers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/`{1,3}[\s\S]*?`{1,3}/g, '') // Code blocks
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links → text
      .replace(/^\s*[-*+]\s+/gm, '• '); // Lists
  }

  // CSV: convert to readable rows
  if (ext === '.csv') {
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0]?.split(',').map(h => h.trim());
    content = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return headers.map((h, i) => `${h}: ${values[i] || ''}`).join(', ');
    }).join('\n');
  }

  // Split into "pages" by paragraphs (paragraphs separated by blank lines)
  const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);

  // Group paragraphs into ~1500-char "pages" for manageable chunks
  const pages = [];
  let currentPage = '';
  let pageNum = 1;

  for (const para of paragraphs) {
    if (currentPage.length + para.length > 1500) {
      if (currentPage) {
        pages.push({ pageNum, text: currentPage.trim() });
        pageNum++;
      }
      currentPage = para;
    } else {
      currentPage += (currentPage ? '\n\n' : '') + para;
    }
  }
  if (currentPage.trim()) pages.push({ pageNum, text: currentPage.trim() });

  return pages.length > 0 ? pages : [{ pageNum: 1, text: content.slice(0, 10000) }];
}

module.exports = { processText };
