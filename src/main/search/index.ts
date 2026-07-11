import { logger } from '../../shared/logger';
import { ddgSearch } from './ddg-search';
import { fetchPages } from './web-fetcher';
import { getSetting } from '../database/settings';

const MAX_CONTENT_TOKENS = 2000;

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content: string;
  fetchedAt: number;
}

function truncateContent(text: string): string {
  const words = text.split(/\s+/);
  if (words.length <= MAX_CONTENT_TOKENS) return text;
  return words.slice(0, MAX_CONTENT_TOKENS).join(' ') + '\n\n[...]';
}

export async function searchWeb(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const googleKey = getSetting('google_api_key');
  const googleCx = getSetting('google_search_engine_id');

  // Try Google first if configured
  if (googleKey && googleCx) {
    try {
      return await searchGoogle(query, googleKey, googleCx, maxResults);
    } catch (err) {
      logger.warn('WebSearch', `Google search failed, falling back to DDG: ${(err as Error).message}`);
    }
  }

  // Default: DuckDuckGo via BrowserWindow
  return searchViaDDG(query, maxResults);
}

async function searchGoogle(query: string, apiKey: string, cx: string, maxResults: number): Promise<WebSearchResult[]> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=${maxResults}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Search API error: ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const googleResults = (data.items || []).map((item: any) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
  }));

  logger.info('WebSearch', `Google returned ${googleResults.length} results, now fetching page content...`);

  const pages = await fetchPages(googleResults);

  return pages.map(p => ({
    title: p.title,
    url: p.url,
    snippet: p.snippet,
    content: truncateContent(p.content),
    fetchedAt: Date.now(),
  }));
}

async function searchViaDDG(query: string, maxResults: number): Promise<WebSearchResult[]> {
  logger.info('WebSearch', `Searching DuckDuckGo via BrowserWindow for: "${query.slice(0, 60)}"`);

  const ddgResults = await ddgSearch(query, maxResults);

  if (ddgResults.length === 0) {
    logger.warn('WebSearch', 'DDG returned 0 results — search unavailable');
    return [];
  }

  logger.info('WebSearch', `DDG returned ${ddgResults.length} results, now fetching page content...`);

  const pages = await fetchPages(ddgResults);

  return pages.map(p => ({
    title: p.title,
    url: p.url,
    snippet: p.snippet,
    content: truncateContent(p.content),
    fetchedAt: Date.now(),
  }));
}
