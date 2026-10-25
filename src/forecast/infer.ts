import { ForecastHorizon, ForecastPoint, FORECAST_HORIZONS, MarketSnapshot, Minifigure } from '../types';
import { getModule } from './modelLoader';

// ─── Feature vector length (must match the .pte model's input tensor shape [16]) ──

const MODEL_INPUT_LENGTH = 16;

/**
 * Runs inference for a single figure at a single horizon.
 * Never throws — returns modelAvailable: false or predictedPriceEur: 0 on error.
 *
 * @param minifig   Full minifigure row from the market DB.
 * @param snapshots Market snapshots ordered ASC (all available; function picks the right ones).
 * @param horizon   Forecast horizon in months.
 * @param targetYear  Calendar year of the forecast target date (e.g. 2026).
 * @param targetHalf  Half-year of the forecast target date (1 = H1, 2 = H2).
 */
export async function inferPrice(
  minifig: Minifigure,
  snapshots: MarketSnapshot[],
  horizon: ForecastHorizon,
  targetYear: number,
  targetHalf: 1 | 2
): Promise<ForecastPoint> {
  const mod = getModule(horizon);

  if (!mod) {
    return { figNum: minifig.figNum, horizonMonths: horizon, predictedPriceEur: 0, modelAvailable: false };
  }

  try {
    const input = buildFeatureVector(minifig, snapshots, targetYear, targetHalf);
    const output = await mod.forward(input);
    const raw = output[0] ?? 0;
    // Model predicts y = log1p(price_target). Inverse transformation is expm1(y) = exp(y) - 1.
    const predictedPriceEur = Math.max(0, Math.expm1(raw));
    return {
      figNum: minifig.figNum,
      horizonMonths: horizon,
      predictedPriceEur,
      modelAvailable: true,
    };
  } catch (err) {
    console.warn(`[infer] Inference failed for ${minifig.figNum} h${horizon}m:`, err);
    return { figNum: minifig.figNum, horizonMonths: horizon, predictedPriceEur: 0, modelAvailable: false };
  }
}

/**
 * Convenience: runs inferPrice for all 8 horizons.
 * Each horizon gets its own targetYear/targetHalf derived from a given base date.
 *
 * @param baseYear  Current year (the "now" point the horizons are measured from).
 * @param baseHalf  Current half-year (1 or 2).
 */
export async function inferAllHorizons(
  minifig: Minifigure,
  snapshots: MarketSnapshot[],
  baseYear: number,
  baseHalf: 1 | 2
): Promise<ForecastPoint[]> {
  return Promise.all(
    FORECAST_HORIZONS.map((h) => {
      const { year, half } = addMonths(baseYear, baseHalf, h);
      return inferPrice(minifig, snapshots, h, year, half);
    })
  );
}

// ─── Feature engineering ──────────────────────────────────────────────────────

/**
 * Builds the 16-element float32 input vector that each .pte model expects.
 *
 * Feature order (must match training pipeline exactly):
 *  0  log_p_initial
 *  1  is_missing_rrp
 *  2  has_true_p0
 *  3  num_source_sets
 *  4  has_arm_printing
 *  5  has_leg_printing
 *  6  detail_word_count
 *  7  is_named
 *  8  lore_depth_score
 *  9  price_6m_ago
 * 10  price_12m_ago
 * 11  has_lag_history
 * 12  market_age_at_target
 * 13  years_retired_at_target
 * 14  is_retire_year_estimated
 * 15  target_half
 */
function buildFeatureVector(
  fig: Minifigure,
  snapshots: MarketSnapshot[],
  targetYear: number,
  targetHalf: 1 | 2
): number[] {
  // ── P0 cascade ────────────────────────────────────────────────────────────
  // Priority: p_first_sold_eu → p_first_observed_eu → cheapest_set_rrp_eu / num_source_sets → 0
  const isMissingRrp = fig.cheapestSetRrpEu == null ? 1 : 0;
  const hasTrueP0 = fig.pFirstSoldEu != null ? 1 : 0;

  let p0: number;
  if (fig.pFirstSoldEu != null) {
    p0 = fig.pFirstSoldEu;
  } else if (fig.pFirstObservedEu != null) {
    p0 = fig.pFirstObservedEu;
  } else if (fig.cheapestSetRrpEu != null && (fig.numSourceSets ?? 0) > 0) {
    // Promo price fallback: distribute set RRP across its figures
    p0 = fig.cheapestSetRrpEu / (fig.numSourceSets as number);
  } else {
    p0 = 0;
  }
  // Cap at a reasonable max to avoid log blow-up (training used the same cap)
  const logPInitial = Math.log1p(Math.max(0, p0));

  // ── Lag prices ────────────────────────────────────────────────────────────
  // "price_6m_ago"  = most recent snapshot price available before target date.
  // "price_12m_ago" = second-most-recent snapshot price, or price_6m_ago if only 1 snap.
  const validSnaps = snapshots.filter((s) => s.avgPriceEu != null);
  const hasLagHistory = validSnaps.length > 0 ? 1 : 0;

  let price6mAgo = p0;
  let price12mAgo = p0;
  if (validSnaps.length >= 1) {
    price6mAgo = validSnaps[validSnaps.length - 1].avgPriceEu as number;
    price12mAgo = validSnaps.length >= 2
      ? (validSnaps[validSnaps.length - 2].avgPriceEu as number)
      : price6mAgo;
  }

  // ── Temporal features ─────────────────────────────────────────────────────
  const releaseYear = fig.releaseYear ?? targetYear;
  const marketAgeAtTarget = Math.max(0, targetYear - releaseYear);

  // Retire year imputation: use retirement_year if known; otherwise estimate
  // from release_year + 3 years (same heuristic as training pipeline).
  let isRetireYearEstimated = 0;
  let retireYear: number;
  if (fig.retirementYear != null) {
    retireYear = fig.retirementYear;
  } else if (fig.estimatedEolYear != null) {
    retireYear = fig.estimatedEolYear;
    isRetireYearEstimated = 1;
  } else {
    retireYear = releaseYear + 3;
    isRetireYearEstimated = 1;
  }
  const yearsRetiredAtTarget = Math.max(0, targetYear - retireYear);

  // ── Assemble vector ───────────────────────────────────────────────────────
  const vec: number[] = [
    /* 0  */ logPInitial,
    /* 1  */ isMissingRrp,
    /* 2  */ hasTrueP0,
    /* 3  */ fig.numSourceSets ?? 0,
    /* 4  */ fig.hasArmPrinting ?? 0,
    /* 5  */ fig.hasLegPrinting ?? 0,
    /* 6  */ fig.detailWordCount ?? 0,
    /* 7  */ fig.isNamed ?? 0,
    /* 8  */ Math.log1p(Math.max(0, fig.wikiArticleLengthBytes ?? 0)),
    /* 9  */ price6mAgo,
    /* 10 */ price12mAgo,
    /* 11 */ hasLagHistory,
    /* 12 */ marketAgeAtTarget,
    /* 13 */ yearsRetiredAtTarget,
    /* 14 */ isRetireYearEstimated,
    /* 15 */ targetHalf,
  ];

  // Sanity: should always be MODEL_INPUT_LENGTH = 16
  if (vec.length !== MODEL_INPUT_LENGTH) {
    console.error(`[infer] Feature vector length ${vec.length} !== ${MODEL_INPUT_LENGTH}`);
  }

  return vec;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Advances a (year, half) date by the given number of months.
 * Each half-year = 6 months.
 */
function addMonths(
  year: number,
  half: 1 | 2,
  months: number
): { year: number; half: 1 | 2 } {
  // Convert to half-units from epoch, add, convert back
  const halfUnits = (year * 2 + (half - 1)) + Math.round(months / 6);
  const newYear = Math.floor(halfUnits / 2);
  const newHalf = (halfUnits % 2 === 0 ? 1 : 2) as 1 | 2;
  return { year: newYear, half: newHalf };
}
