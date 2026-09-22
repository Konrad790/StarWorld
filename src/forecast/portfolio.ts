import {
  CollectionEntry,
  ForecastHorizon,
  FORECAST_HORIZONS,
  MarketSnapshot,
  Minifigure,
  PortfolioDataPoint,
  PortfolioForecastPoint,
  PortfolioTrajectory,
} from '../types';
import { inferAllHorizons } from './infer';

/**
 * Aggregates historical market snapshots and ExecuTorch forecasts for all owned figures
 * into a single PortfolioTrajectory.
 *
 * @param entries      Raw collection entries.
 * @param allSnapshots Snapshot histories keyed by figNum.
 * @param minifigMap   Minifigure rows keyed by figNum (needed for feature engineering).
 * @param baseYear     Current calendar year — horizons are measured forward from here.
 * @param baseHalf     Current half-year (1 or 2).
 */
export async function computePortfolioTrajectory(
  entries: CollectionEntry[],
  allSnapshots: Map<string, MarketSnapshot[]>,
  minifigMap: Map<string, Minifigure>,
  baseYear: number,
  baseHalf: 1 | 2
): Promise<PortfolioTrajectory> {
  const t0 = performance.now();

  if (entries.length === 0) {
    return { historical: [], forecast: [], computedInMs: 0 };
  }

  // ── 1. Aggregate historical price series ────────────────────────────────────
  const periodMap = new Map<string, number>();

  for (const entry of entries) {
    const snaps = allSnapshots.get(entry.figNum) ?? [];
    for (const snap of snaps) {
      if (snap.avgPriceEu == null) continue;
      const key = `${snap.snapshotYear}-H${snap.snapshotHalf}`;
      periodMap.set(key, (periodMap.get(key) ?? 0) + snap.avgPriceEu);
    }
  }

  const historical: PortfolioDataPoint[] = Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totalEur]) => ({ date, totalEur }));

  // ── 2. Aggregate forecasts ───────────────────────────────────────────────────
  const forecastAccum = new Map<ForecastHorizon, { total: number; allAvailable: boolean }>(
    FORECAST_HORIZONS.map((h) => [h, { total: 0, allAvailable: true }])
  );

  await Promise.all(
    entries.map(async (entry) => {
      const minifig = minifigMap.get(entry.figNum);
      if (!minifig) return; // figure not in DB — skip
      const snaps = allSnapshots.get(entry.figNum) ?? [];
      const points = await inferAllHorizons(minifig, snaps, baseYear, baseHalf);
      for (const pt of points) {
        const acc = forecastAccum.get(pt.horizonMonths);
        if (!acc) continue;
        if (!pt.modelAvailable) {
          acc.allAvailable = false;
        } else {
          acc.total += pt.predictedPriceEur;
        }
        forecastAccum.set(pt.horizonMonths, acc);
      }
    })
  );

  const forecast: PortfolioForecastPoint[] = FORECAST_HORIZONS.map((h) => {
    const acc = forecastAccum.get(h) ?? { total: 0, allAvailable: false };
    return {
      horizonMonths: h,
      totalPredictedEur: acc.total,
      allModelsAvailable: acc.allAvailable,
    };
  });

  const computedInMs = performance.now() - t0;
  if (computedInMs > 10) {
    console.warn(`[Portfolio] computePortfolioTrajectory exceeded 10 ms gate: ${computedInMs.toFixed(1)} ms`);
  } else {
    console.log(`[Portfolio] computed in ${computedInMs.toFixed(2)} ms`);
  }

  return { historical, forecast, computedInMs };
}
