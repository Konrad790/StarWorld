import { useCallback, useEffect, useRef, useState } from 'react';
import { getAllMinifiguresSummary } from '../db/queries/minifigures';
import { buildSearchIndex, SearchIndex } from '../search/fuzzyIndex';
import { searchMinifigures } from '../search/searchMinifig';
import { SearchResult } from '../types';
import { useAppInit } from './useAppInit';

interface UseMinifigSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  isIndexReady: boolean;
}

export function useMinifigSearch(debounceMs = 150): UseMinifigSearchResult {
  const { dbReady } = useAppInit();

  const [query, setQueryRaw] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexReady, setIsIndexReady] = useState(false);

  const indexRef = useRef<SearchIndex | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build search index once DB is ready
  useEffect(() => {
    if (!dbReady) return;
    let cancelled = false;

    void (async () => {
      try {
        const summaries = await getAllMinifiguresSummary();
        if (cancelled) return;
        indexRef.current = buildSearchIndex(summaries);
        setIsIndexReady(true);
      } catch (err) {
        console.warn('[useMinifigSearch] Failed to build index:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dbReady]);

  const setQuery = useCallback(
    (q: string) => {
      setQueryRaw(q);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      const trimmed = q.trim();
      if (trimmed.length <= 1) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceTimer.current = setTimeout(() => {
        if (indexRef.current) {
          const found = searchMinifigures(trimmed, indexRef.current);
          setResults(found);
        }
        setIsSearching(false);
      }, debounceMs);
    },
    [debounceMs]
  );

  return { query, setQuery, results, isSearching, isIndexReady };
}
