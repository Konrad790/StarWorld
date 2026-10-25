import { Minifigure, MarketSnapshot, MinifigSummary } from '../../types';
import { getMarketDb, QueryError } from '../client';

// ─── Row types matching the bundled DB schema ─────────────────────────────────

interface MinifigRow {
  fig_num: string;
  bricklink_id: string | null;
  name: string;
  release_year: number | null;
  retirement_year: number | null;
  estimated_eol_year: number | null;
  num_source_sets: number | null;
  cheapest_set_rrp_eu: number | null;
  has_arm_printing: number | null;
  has_leg_printing: number | null;
  detail_word_count: number | null;
  is_named: number | null;
  wiki_article_length_bytes: number | null;
  p_first_sold_eu: number | null;
  p_first_observed_eu: number | null;
  created_at: string | null;
  image_url: string | null;
  current_price?: number | null;
}

interface SnapshotRow {
  fig_num: string;
  snapshot_year: number;
  snapshot_half: number;
  avg_price_eu: number | null;
  num_sold_6m_eu: number | null;
  num_currently_listed_eu: number | null;
  created_at: string | null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns one minifigure by its Rebrickable fig_num, with its latest market price. */
export async function getMinifigureById(
  figNum: string
): Promise<Minifigure | null> {
  try {
    const db = getMarketDb();
    const row = await db.getFirstAsync<MinifigRow>(
      `SELECT
         m.fig_num, m.bricklink_id, m.name,
         m.release_year, m.retirement_year, m.estimated_eol_year,
         m.num_source_sets, m.cheapest_set_rrp_eu,
         m.has_arm_printing, m.has_leg_printing,
         m.detail_word_count, m.is_named, m.wiki_article_length_bytes,
         m.p_first_sold_eu, m.p_first_observed_eu,
         m.created_at, m.image_url,
         COALESCE(s.avg_price_eu, m.p_first_observed_eu) AS current_price
       FROM minifigures m
       LEFT JOIN (
         SELECT fig_num, avg_price_eu, MAX(snapshot_year * 10 + snapshot_half)
         FROM market_snapshots
         WHERE fig_num = ?
         GROUP BY fig_num
       ) s ON m.fig_num = s.fig_num
       WHERE m.fig_num = ?`,
      [figNum, figNum]
    );
    if (!row) return null;
    return rowToMinifigure(row);
  } catch (err) {
    throw new QueryError(`getMinifigureById failed: ${String(err)}`, err);
  }
}

/**
 * Returns all fig_num + name pairs for the Fuse.js search index.
 * Does NOT include price or image data.
 */
export async function getAllMinifiguresSummary(): Promise<MinifigSummary[]> {
  try {
    const db = getMarketDb();
    interface SummaryRow {
      fig_num: string;
      bricklink_id: string | null;
      name: string;
      current_price: number | null;
    }
    const rows = await db.getAllAsync<SummaryRow>(
      `SELECT 
         m.fig_num, 
         m.bricklink_id, 
         m.name,
         COALESCE(s.avg_price_eu, m.p_first_observed_eu) AS current_price
       FROM minifigures m
       LEFT JOIN (
         SELECT fig_num, avg_price_eu, MAX(snapshot_year * 10 + snapshot_half)
         FROM market_snapshots
         GROUP BY fig_num
       ) s ON m.fig_num = s.fig_num
       ORDER BY m.name ASC`
    );
    return rows.map((r: SummaryRow) => ({
      figNum: r.fig_num,
      bricklinkId: r.bricklink_id,
      name: r.name,
      currentPrice: r.current_price,
    }));
  } catch (err) {
    throw new QueryError(`getAllMinifiguresSummary failed: ${String(err)}`, err);
  }
}

/** Returns full snapshot history for one figure, ordered by year + half ASC. */
export async function getMarketSnapshots(
  figNum: string
): Promise<MarketSnapshot[]> {
  try {
    const db = getMarketDb();
    const rows = await db.getAllAsync<SnapshotRow>(
      `SELECT fig_num, snapshot_year, snapshot_half,
              avg_price_eu, num_sold_6m_eu, num_currently_listed_eu, created_at
       FROM market_snapshots
       WHERE fig_num = ?
       ORDER BY snapshot_year ASC, snapshot_half ASC`,
      [figNum]
    );
    return rows.map(rowToSnapshot);
  } catch (err) {
    throw new QueryError(`getMarketSnapshots failed: ${String(err)}`, err);
  }
}

/**
 * Batch snapshot history for multiple figures — single SQL round-trip.
 * Returns a Map keyed by figNum.
 */
export async function getMarketSnapshotsBatch(
  figNums: string[]
): Promise<Map<string, MarketSnapshot[]>> {
  if (figNums.length === 0) return new Map();
  try {
    const db = getMarketDb();
    const placeholders = figNums.map(() => '?').join(', ');
    const rows = await db.getAllAsync<SnapshotRow>(
      `SELECT fig_num, snapshot_year, snapshot_half,
              avg_price_eu, num_sold_6m_eu, num_currently_listed_eu, created_at
       FROM market_snapshots
       WHERE fig_num IN (${placeholders})
       ORDER BY fig_num, snapshot_year ASC, snapshot_half ASC`,
      figNums
    );
    const result = new Map<string, MarketSnapshot[]>();
    for (const row of rows) {
      const id = row.fig_num;
      const list = result.get(id) ?? [];
      list.push(rowToSnapshot(row));
      result.set(id, list);
    }
    return result;
  } catch (err) {
    throw new QueryError(`getMarketSnapshotsBatch failed: ${String(err)}`, err);
  }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function rowToMinifigure(row: MinifigRow): Minifigure {
  return {
    figNum: row.fig_num,
    bricklinkId: row.bricklink_id,
    name: row.name,
    releaseYear: row.release_year,
    retirementYear: row.retirement_year,
    estimatedEolYear: row.estimated_eol_year,
    numSourceSets: row.num_source_sets,
    cheapestSetRrpEu: row.cheapest_set_rrp_eu,
    hasArmPrinting: row.has_arm_printing,
    hasLegPrinting: row.has_leg_printing,
    detailWordCount: row.detail_word_count,
    isNamed: row.is_named,
    wikiArticleLengthBytes: row.wiki_article_length_bytes,
    pFirstSoldEu: row.p_first_sold_eu,
    pFirstObservedEu: row.p_first_observed_eu,
    createdAt: row.created_at,
    imageUrl: row.image_url,
    currentPrice: row.current_price ?? row.p_first_observed_eu,
  };
}

function rowToSnapshot(row: SnapshotRow): MarketSnapshot {
  return {
    figNum: row.fig_num,
    snapshotYear: row.snapshot_year,
    snapshotHalf: row.snapshot_half,
    avgPriceEu: row.avg_price_eu,
    numSold6mEu: row.num_sold_6m_eu,
    numCurrentlyListedEu: row.num_currently_listed_eu,
    createdAt: row.created_at,
  };
}
