/**
 * Re-exports the web-search implementation so engine-level modules can
 * import from a single `./web-search` path regardless of the provider.
 */
export { searchWeb } from '../search/index';
export type { WebSearchResult } from '../search/index';
