import { useEffect, useMemo, useRef, useState } from 'react';
import { getMarketSnapshotsBatch, getMinifigureById } from '../db/queries/minifigures';
import { computePortfolioTrajectory } from '../forecast/portfolio';
import { CollectionEntryView, Minifigure, PortfolioTrajectory } from '../types';
import { useAppInit } from './useAppInit';

interface UsePortfolioChartResult {
  trajectory: PortfolioTrajectory | null;
  isLoading: boolean;
}

export function usePortfolioChart(
  entries: CollectionEntryView[]
): UsePortfolioChartResult {
  const { dbReady, modelsStatus } = useAppInit();
  const [trajectory, setTrajectory] = useState<PortfolioTrajectory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Stable reference key: changes only when actual entry IDs or prices change
  const entriesKey = useMemo(
    () =>
      entries
        .map((e) => `${e.entry.id}:${e.entry.purchasePriceEur}`)
        .join(','),
    [entries]
  );

  const computeRef = useRef(0);

  useEffect(() => {
    if (!dbReady || modelsStatus === 'loading') return;
    if (entries.length === 0) {
      setTrajectory(null);
      return;
    }

    computeRef.current += 1;
    const rev = computeRef.current;

    setIsLoading(true);
    void (async () => {
      try {
        const figNums = [...new Set(entries.map((e) => e.entry.figNum))];

        const [allSnapshots, minifigEntries] = await Promise.all([
          getMarketSnapshotsBatch(figNums),
          Promise.all(figNums.map(async (fn) => [fn, await getMinifigureById(fn)] as const)),
        ]);

        if (rev !== computeRef.current) return; // stale

        const minifigMap = new Map<string, Minifigure>(
          minifigEntries.flatMap(([fn, fig]) => (fig ? [[fn, fig]] : []))
        );

        const now = new Date();
        const baseYear = now.getFullYear();
        const baseHalf = (now.getMonth() < 6 ? 1 : 2) as 1 | 2;

        const rawEntries = entries.map((v) => v.entry);
        const result = await computePortfolioTrajectory(rawEntries, allSnapshots, minifigMap, baseYear, baseHalf);

        if (rev === computeRef.current) {
          setTrajectory(result);
        }
      } catch (err) {
        console.warn('[usePortfolioChart] Error:', err);
      } finally {
        if (rev === computeRef.current) setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbReady, modelsStatus, entriesKey]);

  return { trajectory, isLoading };
}
