import { BrowserWindow } from 'electron';
import { logger } from '../../shared/logger';
import { extractContent } from './extract';
import { getCached, setCached } from './cache';

const MAX_CONCURRENT = 3;
const PAGE_TIMEOUT_MS = 10000;

let activeFetches = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (activeFetches < MAX_CONCURRENT) {
    activeFetches++;
    return Promise.resolve();
  }
  return new Promise(resolve => {
    queue.push(() => {
      activeFetches++;
      resolve();
    });
  });
}

function release(): void {
  if (queue.length > 0) {
    const next = queue.shift()!;
    next();
  } else {
    activeFetches--;
  }
}

export interface FetchedPage {
  url: string;
  title: string;
  snippet: string;
  content: string;
}

export async function fetchAndClean(url: string, snippet: string, title: string): Promise<FetchedPage> {
  const cached = getCached(url);
  if (cached) {
    return { url, title: cached.title, snippet: cached.snippet, content: cached.markdown };
  }

  await acquire();
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

    const html: string = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout loading ${url.slice(0, 80)}`));
      }, PAGE_TIMEOUT_MS);

      win!.webContents.on('did-finish-load', () => {
        clearTimeout(timer);
        win!.webContents.executeJavaScript('document.documentElement.outerHTML')
          .then((raw: string) => resolve(raw))
          .catch(reject);
      });

      win!.webContents.on('did-fail-load', (_event, _code, desc) => {
        clearTimeout(timer);
        reject(new Error(`Load failed: ${desc}`));
      });

      try {
        win!.loadURL(url);
      } catch (err) {
        clearTimeout(timer);
        reject(new Error(`Failed to load URL: ${err instanceof Error ? err.message : String(err)}`));
      }
    });

    const markdown = extractContent(html, url);

    setCached(url, title, markdown, snippet);

    return { url, title, snippet, content: markdown };
  } finally {
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
    release();
  }
}

export async function fetchPages(
  results: Array<{ title: string; url: string; snippet: string }>
): Promise<FetchedPage[]> {
  const pages = await Promise.allSettled(
    results.map(r => fetchAndClean(r.url, r.snippet, r.title))
  );

  const successful: FetchedPage[] = [];
  for (const p of pages) {
    if (p.status === 'fulfilled') {
      successful.push(p.value);
    } else {
      logger.warn('WebFetcher', `Failed to fetch page: ${p.reason}`);
    }
  }

  return successful;
}
