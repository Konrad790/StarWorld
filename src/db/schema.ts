// DDL for the user_collection table in user.db
// This is the ONLY writable SQLite table in the app.

export const CREATE_USER_COLLECTION_TABLE = `
  CREATE TABLE IF NOT EXISTS user_collection (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    fig_num             TEXT    NOT NULL,
    purchase_price_eur  REAL    NOT NULL CHECK (purchase_price_eur > 0),
    added_at            TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`.trim();

export const CREATE_USER_COLLECTION_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_user_collection_fig_num
    ON user_collection(fig_num);
`.trim();

// DB version stored in user.db to detect when the bundled market DB asset needs re-copy
export const CREATE_APP_META_TABLE = `
  CREATE TABLE IF NOT EXISTS app_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`.trim();

export const MARKET_DB_VERSION_KEY = 'market_db_version';
