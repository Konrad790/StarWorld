import Fuse, { type IFuseOptions } from 'fuse.js';
import { MinifigSummary, SearchResult } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchIndex = Fuse<MinifigSummary>;

// ─── Canonical Fuse.js config (from contracts/search.md) ─────────────────────

const FUSE_OPTIONS: IFuseOptions<MinifigSummary> = {
  keys: [
    { name: 'figNum', weight: 0.4 },
    { name: 'bricklinkId', weight: 0.4 },
    { name: 'name', weight: 0.2 },
  ],
  threshold: 0.35,
  minMatchCharLength: 2,
  includeScore: true,
  ignoreLocation: true,
};

// ─── Index builder ────────────────────────────────────────────────────────────

/**
 * Builds and returns a Fuse.js in-memory search index.
 * Called once at app startup after getAllMinifiguresSummary() completes.
 * Synchronous — Fuse.js index construction happens in < 100 ms for ≤ 5 000 entries.
 */
export function buildSearchIndex(entries: MinifigSummary[]): SearchIndex {
  return new Fuse(entries, FUSE_OPTIONS);
}

// ─── Search ───────────────────────────────────────────────────────────────────

const ID_PATTERN = /^sw\d+/i;
const MAX_RESULTS = 50;

/**
 * Performs an on-device fuzzy search against the pre-built index.
 * Searches fig_num, bricklink_id, and name.
 * Returns up to 50 results ordered by relevance (lower score = better match).
 *
 * Returns [] immediately for:
 *  - empty / whitespace-only queries
 *  - queries ≤ 1 character (below minMatchCharLength)
 */
export function searchMinifigures(
  query: string,
  index: SearchIndex
): SearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length <= 1) return [];

  const rawResults = index.search(trimmed, { limit: MAX_RESULTS });

  const mapped: SearchResult[] = rawResults.map((r) => ({
    figNum: r.item.figNum,
    bricklinkId: r.item.bricklinkId,
    name: r.item.name,
    score: r.score ?? 1,
  }));

  // For ID-like queries (sw\d+), boost exact prefix matches on either ID field to the top
  if (ID_PATTERN.test(trimmed)) {
    const lower = trimmed.toLowerCase();
    mapped.sort((a, b) => {
      const aMatch = a.figNum.toLowerCase().startsWith(lower) ? 0 : 1;
      const bMatch = b.figNum.toLowerCase().startsWith(lower) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.score - b.score;
    });
  }

  // De-duplicate by figNum (Fuse may return same item via different key paths)
  const seen = new Set<string>();
  return mapped.filter(({ figNum }) => {
    if (seen.has(figNum)) return false;
    seen.add(figNum);
    return true;
  });
}
