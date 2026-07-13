import { readFile } from 'fs/promises';
import path from 'path';

interface PageData {
  pageNum: number;
  text: string;
}

function yieldToGUI(): Promise<void> {
  return new Promise<void>(r => setTimeout(r, 0));
}

export async function processText(filePath: string): Promise<PageData[]> {
  const ext = path.extname(filePath).toLowerCase();
  const raw = await readFile(filePath);
  // Detect binary files (files with null bytes or high proportion of non-text bytes)
  const nullByteCount = raw.filter(b => b === 0).length;
  const nonAsciiCount = raw.filter(b => b > 127 && b < 32 && b !== 9 && b !== 10 && b !== 13).length;
  if (nullByteCount > 0 || nonAsciiCount > raw.length * 0.1) {
    throw new Error(`Cannot read "${path.basename(filePath)}" — this file appears to be a binary/image file, not a text document. Supported formats: PDF, TXT, MD, CSV.`);
  }
  let content = raw.toString('utf-8');

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
      await yieldToGUI();
  }

  const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);

  const pages: PageData[] = [];
  let currentPage = '';
  let pageNum = 1;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    if (currentPage.length + para.length > 1500) {
      if (currentPage) {
        pages.push({ pageNum, text: currentPage.trim() });
        pageNum++;
      }
      currentPage = para;
    } else {
      currentPage += (currentPage ? '\n\n' : '') + para;
    }
    if (i % 20 === 0) {
    await yieldToGUI();
    }
  }
  if (currentPage.trim()) pages.push({ pageNum, text: currentPage.trim() });

  return pages.length > 0 ? pages : [{ pageNum: 1, text: content.slice(0, 10000) }];
}
