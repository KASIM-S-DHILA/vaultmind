# Feature: Local Web Search for Electron AI Assistant

## Goal
Add a "web search" capability to the AI assistant so it can look up current
information, fetch clean page content, and inject it into the LLM context —
entirely with local tooling, no paid search APIs, no required external
installs (must work in a distributed .exe with zero setup).

## Architecture (revised — DDG-via-BrowserWindow as default)
```
User query (renderer)
   → IPC to main process
   → hidden BrowserWindow loads DuckDuckGo HTML results page (real Chromium,
     not fetch() — avoids bot detection)
   → main process extracts result URLs via executeJavaScript()
   → parallel hidden BrowserWindow fetch of each result URL (renders JS pages)
   → Readability + Turndown (strip boilerplate, convert to Markdown)
   → SQLite cache (avoid re-scraping same URL within TTL)
   → IPC back to renderer
   → inject top N results (full cleaned content) into LLM prompt as [WebN]
     with [source: url] citations
```
SearXNG is demoted to an **optional advanced backend** (see section 6) for
users who already self-host it — not the default path, since requiring
Docker is unrealistic for a distributable desktop app.

## 1. Search backend — DuckDuckGo via hidden BrowserWindow (default)
- Create a hidden `BrowserWindow` (`show: false`) in the **main process**
- Load `https://html.duckduckgo.com/html/?q=<query>` — this is a real
  Chromium navigation, not `fetch()`, so it isn't flagged as a bot
- Wait for `did-finish-load`, then `executeJavaScript()` to pull result
  links/titles/snippets from the DOM (selectors: `.result__a`, `.result__snippet`)
- Destroy the window after extraction
- **Rate limiting:** add a small random delay (e.g. 500ms-1.5s) between
  consecutive searches — DDG can still fingerprint on request cadence even
  from a real browser context
- **Graceful degradation:** if DDG serves a CAPTCHA/challenge page (detect
  via missing expected selectors), fail soft — return an empty result set
  with a "search temporarily unavailable" flag rather than throwing, so the
  LLM pipeline doesn't crash

## 2. Content extraction — reuse Electron's Chromium
No headless browser dependency needed (no Puppeteer/Playwright) — the app
already ships Chromium. Same technique as the search step: a real
`BrowserWindow` per target URL, not `fetch()`.

- Create a hidden `BrowserWindow` (`show: false`) per URL to fetch
- Load the URL, wait for `did-finish-load` (handles JS-rendered pages)
- Run `webContents.executeJavaScript()` to grab `document.documentElement.outerHTML`
- Destroy the window after extraction (don't leak windows — pool/limit
  concurrency to ~3-4 parallel fetches)
- Respect a timeout (e.g. 10s) per page in case a site hangs

## 3. Clean extraction pipeline
- `@mozilla/readability` — strip nav/ads/sidebars, extract main article body
  (same engine as Firefox Reader Mode)
- `turndown` — convert the cleaned HTML to Markdown (best format for LLM
  context: preserves structure, low token overhead vs raw HTML)
- `jsdom` — needed to construct the DOM object Readability expects

## 4. Caching — SQLite (already in the app via better-sqlite3)
- Table: `url TEXT PRIMARY KEY, markdown TEXT, fetched_at INTEGER`
- TTL: a few hours (configurable) — skip re-scraping repeat queries
- Check cache before opening a BrowserWindow for a given URL

## 5. Output shape fed to LLM — inject as [WebN], full content not snippet
```ts
interface ScrapedResult {
  title: string;
  url: string;
  snippet: string;    // from DDG results page, kept for fallback/display
  content: string;     // cleaned markdown, truncated to ~1500-2000 tokens
  fetchedAt: number;
}
```
Inject top 5-8 results into the prompt, each tagged `[WebN]` with
`[source: url]`, using the full cleaned `content` field rather than just the
search snippet — this is the one-line change from the current
snippet-only implementation.

## 6. IPC flow (renderer never touches network/BrowserWindow directly)
```
renderer: invoke('web-search', query)
main:      ipcMain.handle('web-search', async (_, query) => {
             results = await ddgSearch(query)       // hidden BrowserWindow
             pages   = await Promise.all(            // pooled, 3-4 concurrent
               results.map(r => fetchAndClean(r.url)) // cache check → BrowserWindow → Readability/Turndown
             )
             return pages
           })
renderer: receives ScrapedResult[], injects into LLM prompt
```

## 7. Optional advanced backend — SearXNG
For power users who already self-host SearXNG:
- Add a settings toggle: "Search backend: DuckDuckGo (default) | SearXNG (self-hosted)"
- If SearXNG selected, query `GET http://localhost:8888/search?q=<query>&format=json`
  (requires `search.formats: [html, json]` enabled in the user's `settings.yml`)
- Same downstream pipeline (fetch → Readability → Turndown → cache) applies
  regardless of which backend supplied the URLs
- Not required for v1 — build DDG path first, add this as a stretch goal

## Suggested file structure
```
src/
  search/
    ddg-search.ts            // hidden BrowserWindow → DuckDuckGo HTML results
    searxng-client.ts        // optional: query self-hosted SearXNG, parse JSON
    web-fetcher.ts            // BrowserWindow-based page fetch + timeout/pool
    extract.ts                  // Readability + Turndown pipeline
    cache.ts                    // SQLite cache layer (better-sqlite3)
    index.ts                    // orchestrates: query → results → inject into context
  main/
    ipc-handlers.ts            // registers 'web-search' ipcMain.handle
```

## Dependencies to add
```
npm install @mozilla/readability turndown jsdom
```
(`better-sqlite3` already in the project per current implementation.)

## Nice-to-haves (skip for v1)
- `robots.txt` check before fetching a URL
- Domain allow/deny list
- Streaming partial results back to UI as each page finishes fetching
- Configurable result count / cache TTL in app settings
- SearXNG backend toggle (section 7)
