import { BrowserWindow } from 'electron';
import { logger } from '../../shared/logger';

const MIN_DELAY_MS = 500;
const MAX_DELAY_MS = 1500;
let lastSearchTime = 0;

function extractResultsJS(): string {
  return `
(function() {
  const items = document.querySelectorAll('.result');
  if (items.length === 0) return JSON.stringify([]);
  const results = [];
  for (const item of items) {
    const linkEl = item.querySelector('.result__a');
    if (!linkEl) continue;
    let url = linkEl.getAttribute('href') || '';
    if (url.includes('uddg=')) {
      try {
        const m = url.match(/uddg=([^&]+)/);
        if (m) url = decodeURIComponent(m[1]);
      } catch(e) {}
    }
    if (url.startsWith('//')) url = 'https:' + url;
    const title = (linkEl.textContent || '').trim();
    const snippetEl = item.querySelector('.result__snippet');
    const snippet = snippetEl ? (snippetEl.textContent || '').trim() : '';
    if (title) results.push({ title, url, snippet });
  }
  return JSON.stringify(results);
})();
`;
}

export interface DdgResult {
  title: string;
  url: string;
  snippet: string;
}

export async function ddgSearch(query: string, maxResults = 5): Promise<DdgResult[]> {
  const now = Date.now();
  const elapsed = now - lastSearchTime;
  if (elapsed < MAX_DELAY_MS) {
    const delay = Math.max(MIN_DELAY_MS, MAX_DELAY_MS - elapsed) + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    await new Promise(r => setTimeout(r, delay));
  }
  lastSearchTime = Date.now();

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  let win: BrowserWindow | null = null;

  try {
    win = new BrowserWindow({
      show: false,
      width: 1024,
      height: 768,
      webPreferences: {
        sandbox: true,
        javascript: true,
        images: false,
      },
    });

    const rawJson: string = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout searching DuckDuckGo`));
      }, 15000);

      win!.webContents.on('did-finish-load', () => {
        clearTimeout(timer);
        win!.webContents.executeJavaScript(extractResultsJS())
          .then((json: string) => resolve(json))
          .catch(reject);
      });

      win!.webContents.on('did-fail-load', (_event, _code, desc) => {
        clearTimeout(timer);
        reject(new Error(`Search page load failed: ${desc}`));
      });

      win!.loadURL(url);
    });

    const allResults: DdgResult[] = JSON.parse(rawJson);
    const results = allResults.slice(0, maxResults);

    if (results.length === 0) {
      logger.warn('DDGSearch', `No results found (possible CAPTCHA challenge page)`);
    } else {
      logger.info('DDGSearch', `Found ${results.length} results for "${query.slice(0, 60)}"`);
    }

    return results;
  } finally {
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  }
}
