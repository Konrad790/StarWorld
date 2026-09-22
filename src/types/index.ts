import { ImageRequireSource } from 'react-native';

// ─── Forecast ────────────────────────────────────────────────────────────────

export type ForecastHorizon = 6 | 12 | 18 | 24 | 30 | 36 | 42 | 48;

export const FORECAST_HORIZONS: ForecastHorizon[] = [6, 12, 18, 24, 30, 36, 42, 48];

// ─── Market Data (read-only, lego_sw_market.db) ───────────────────────────────

export interface Minifigure {
  figNum: string;
  bricklinkId: string | null;
  name: string;
  releaseYear: number | null;
  retirementYear: number | null;
  estimatedEolYear: number | null;
  numSourceSets: number | null;
  cheapestSetRrpEu: number | null;
  hasArmPrinting: number | null;
  hasLegPrinting: number | null;
  detailWordCount: number | null;
  isNamed: number | null;
  wikiArticleLengthBytes: number | null;
  pFirstSoldEu: number | null;
  pFirstObservedEu: number | null;
  createdAt: string | null;
  imageUrl: string | null;
}

/** One half-year market snapshot row from market_snapshots. */
export interface MarketSnapshot {
  figNum: string;
  snapshotYear: number;
  snapshotHalf: number;  // 1 or 2
  avgPriceEu: number | null;
  numSold6mEu: number | null;
  numCurrentlyListedEu: number | null;
  createdAt: string | null;
}

// ─── ML Forecast (derived at runtime) ────────────────────────────────────────

export interface ForecastPoint {
  figNum: string;
  horizonMonths: ForecastHorizon;
  predictedPriceEur: number;
  modelAvailable: boolean;
}

// ─── User Collection (user.db) ───────────────────────────────────────────────

export interface CollectionEntry {
  id: number;
  figNum: string;
  purchasePriceEur: number;
  addedAt: string;      // ISO datetime
}

export interface CollectionEntryView {
  entry: CollectionEntry;
  minifig: Minifigure | null;
  roi: number | null;
}

export interface AddCollectionInput {
  figNum: string;
  purchasePriceEur: number;
}

// ─── Portfolio (derived) ──────────────────────────────────────────────────────

export interface PortfolioDataPoint {
  date: string;
  totalEur: number;
}

export interface PortfolioForecastPoint {
  horizonMonths: ForecastHorizon;
  totalPredictedEur: number;
  allModelsAvailable: boolean;
}

export interface PortfolioTrajectory {
  historical: PortfolioDataPoint[];
  forecast: PortfolioForecastPoint[];
  computedInMs: number;
}

// ─── ML Engine State ──────────────────────────────────────────────────────────

export type ModelLoadStatus = 'loading' | 'ready' | 'partial' | 'failed';

export interface ForecastEngineState {
  status: ModelLoadStatus;
  loadedHorizons: ForecastHorizon[];
  failedHorizons: ForecastHorizon[];
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  figNum: string;
  bricklinkId: string | null;
  name: string;
  score: number; // Fuse.js score; lower = better match (0 = exact)
}

export interface MinifigSummary {
  figNum: string;
  bricklinkId: string | null;
  name: string;
}

// ─── DB handles (opaque, managed by db/client.ts) ────────────────────────────

// expo-sqlite v15+ uses SQLiteDatabase
// We re-export the type alias here to avoid importing expo-sqlite directly in consumers
export type { SQLiteDatabase } from 'expo-sqlite';

// ─── Asset refs (used by constants/models.ts) ────────────────────────────────

export interface ModelAssetEntry {
  horizon: ForecastHorizon;
  assetRequire: ImageRequireSource;
  filename: string;
}
