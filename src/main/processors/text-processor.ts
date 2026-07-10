import fs from 'fs';
import path from 'path';

interface PageData {
  pageNum: number;
  text: string;
}

export async function processText(filePath: string): Promise<PageData[]> {
  const ext = path.extname(filePath).toLowerCase();
  let content = fs.readFileSync(filePath, 'utf-8');

  if (ext === '.md') {
    content = content
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`{1,3}[\s\S]*?`{1,3}/g, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '• ');
  }

  if (ext === '.csv') {
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0]?.split(',').map(h => h.trim()) ?? [];
    content = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return headers.map((h, i) => `${h}: ${values[i] || ''}`).join(', ');
    }).join('\n');
  }

  const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);

  const pages: PageData[] = [];
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
