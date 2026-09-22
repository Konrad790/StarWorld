import { AddCollectionInput, CollectionEntry } from '../../types';
import { getUserDb, NotFoundError, QueryError, ValidationError } from '../client';

// ─── Row type ─────────────────────────────────────────────────────────────────

interface CollectionRow {
  id: number;
  fig_num: string;
  purchase_price_eur: number;
  added_at: string;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateInput(input: AddCollectionInput): void {
  if (!input.figNum || input.figNum.trim().length === 0) {
    throw new ValidationError('figNum must be a non-empty string');
  }
  if (!input.purchasePriceEur || input.purchasePriceEur <= 0) {
    throw new ValidationError('purchasePriceEur must be greater than 0');
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns all collection entries ordered by addedAt DESC. */
export async function getCollectionEntries(): Promise<CollectionEntry[]> {
  try {
    const db = getUserDb();
    const rows = await db.getAllAsync<CollectionRow>(
      'SELECT id, fig_num, purchase_price_eur, added_at FROM user_collection ORDER BY added_at DESC'
    );
    return rows.map(rowToEntry);
  } catch (err) {
    throw new QueryError(`getCollectionEntries failed: ${String(err)}`, err);
  }
}

/** Inserts a new collection entry and returns the full persisted record. */
export async function addCollectionEntry(
  input: AddCollectionInput
): Promise<CollectionEntry> {
  validateInput(input);
  try {
    const db = getUserDb();
    const result = await db.runAsync(
      `INSERT INTO user_collection (fig_num, purchase_price_eur)
       VALUES (?, ?)`,
      [input.figNum, input.purchasePriceEur]
    );
    const newRow = await db.getFirstAsync<CollectionRow>(
      'SELECT id, fig_num, purchase_price_eur, added_at FROM user_collection WHERE id = ?',
      [result.lastInsertRowId]
    );
    if (!newRow) throw new QueryError('Failed to read newly inserted collection entry');
    return rowToEntry(newRow);
  } catch (err) {
    if (err instanceof ValidationError || err instanceof QueryError) throw err;
    throw new QueryError(`addCollectionEntry failed: ${String(err)}`, err);
  }
}

/** Updates the purchase price for an existing collection entry. */
export async function updateCollectionEntryPrice(
  id: number,
  newPriceEur: number
): Promise<void> {
  if (!newPriceEur || newPriceEur <= 0) {
    throw new ValidationError('newPriceEur must be greater than 0');
  }
  try {
    const db = getUserDb();
    const result = await db.runAsync(
      'UPDATE user_collection SET purchase_price_eur = ? WHERE id = ?',
      [newPriceEur, id]
    );
    if (result.changes === 0) {
      throw new NotFoundError(`Collection entry with id=${id} not found`);
    }
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    throw new QueryError(`updateCollectionEntryPrice failed: ${String(err)}`, err);
  }
}

/** Deletes a collection entry by id. Throws NotFoundError if it does not exist. */
export async function deleteCollectionEntry(id: number): Promise<void> {
  try {
    const db = getUserDb();
    const result = await db.runAsync(
      'DELETE FROM user_collection WHERE id = ?',
      [id]
    );
    if (result.changes === 0) {
      throw new NotFoundError(`Collection entry with id=${id} not found`);
    }
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new QueryError(`deleteCollectionEntry failed: ${String(err)}`, err);
  }
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function rowToEntry(row: CollectionRow): CollectionEntry {
  return {
    id: row.id,
    figNum: row.fig_num,
    purchasePriceEur: row.purchase_price_eur,
    addedAt: row.added_at,
  };
}
