import { useEffect, useState } from 'react';
import { getMinifigureById, getMarketSnapshots } from '../db/queries/minifigures';
import { inferAllHorizons } from '../forecast/infer';
import { ForecastPoint, MarketSnapshot, Minifigure } from '../types';
import { useAppInit } from './useAppInit';

interface UseMinifigDetailResult {
  minifig: Minifigure | null;
  snapshots: MarketSnapshot[];
  forecasts: ForecastPoint[];
  isLoading: boolean;
  error: string | null;
}

export function useMinifigDetail(figNum: string): UseMinifigDetailResult {
  const { dbReady, modelsStatus } = useAppInit();

  const [minifig, setMinifig] = useState<Minifigure | null>(null);
  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([]);
  const [forecasts, setForecasts] = useState<ForecastPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dbReady || !figNum) return;
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Load minifig data and snapshots in parallel
        const [fig, snaps] = await Promise.all([
          getMinifigureById(figNum),
          getMarketSnapshots(figNum),
        ]);

        if (cancelled) return;
        setMinifig(fig);
        setSnapshots(snaps);

        // Run forecasts if models are loaded (not while still loading or failed)
        if ((modelsStatus === 'ready' || modelsStatus === 'partial') && fig) {
          const now = new Date();
          const baseYear = now.getFullYear();
          const baseHalf = (now.getMonth() < 6 ? 1 : 2) as 1 | 2;
          const pts = await inferAllHorizons(fig, snaps, baseYear, baseHalf);
          if (!cancelled) setForecasts(pts);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load minifigure');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [figNum, dbReady, modelsStatus]);

  return { minifig, snapshots, forecasts, isLoading, error };
}
