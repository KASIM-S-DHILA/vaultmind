import { describe, it, expect, vi, beforeEach } from 'vitest';

// We only test the pure-logic helpers since LanceDB is a native dependency.
// The tableNameFor function and the filter-query construction are the parts
// most likely to have bugs.

// Replicate the helper for testing
function tableNameFor(notebookId: string): string {
  return 'nb_' + notebookId.replace(/-/g, '_');
}

function buildFilter(sourceFilter: string[]): string {
  const ids = sourceFilter.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');
  return `source_id IN (${ids})`;
}

describe('vector-store helpers', () => {
  it('tableNameFor converts notebook UUID to safe table name', () => {
    expect(tableNameFor('123e4567-e89b-12d3-a456-426614174000'))
      .toBe('nb_123e4567_e89b_12d3_a456_426614174000');
  });

  it('tableNameFor handles simple IDs', () => {
    expect(tableNameFor('nb1')).toBe('nb_nb1');
  });

  it('buildFilter creates single-element IN clause', () => {
    expect(buildFilter(['src1'])).toBe("source_id IN ('src1')");
  });

  it('buildFilter creates multi-element IN clause', () => {
    expect(buildFilter(['src1', 'src2'])).toBe("source_id IN ('src1', 'src2')");
  });

  it('buildFilter escapes single quotes in source IDs', () => {
    expect(buildFilter(["it's"])).toBe("source_id IN ('it''s')");
  });

  it('buildFilter returns empty IN clause for empty array', () => {
    expect(buildFilter([])).toBe('source_id IN ()');
  });
});
