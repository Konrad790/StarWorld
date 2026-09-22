import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { defaultDatabaseDirectory, openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import {
  CREATE_APP_META_TABLE,
  CREATE_USER_COLLECTION_INDEX,
  CREATE_USER_COLLECTION_TABLE,
  MARKET_DB_VERSION_KEY,
} from './schema';

// ─── Error Types ──────────────────────────────────────────────────────────────

export class DatabaseInitError extends Error {
  readonly code = 'DATABASE_INIT_ERROR';
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DatabaseInitError';
    if (cause instanceof Error) this.stack = cause.stack;
  }
}

export class QueryError extends Error {
  readonly code = 'QUERY_ERROR';
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'QueryError';
    if (cause instanceof Error) this.stack = cause.stack;
  }
}

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND';
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKET_DB_FILENAME = 'lego_sw_market.db';
const USER_DB_FILENAME = 'user.db';
const CURRENT_MARKET_DB_VERSION = '2.0.0';

// ─── Singletons ───────────────────────────────────────────────────────────────

let _marketDb: SQLiteDatabase | null = null;
let _userDb: SQLiteDatabase | null = null;
let _initPromise: Promise<{ marketDb: SQLiteDatabase; userDb: SQLiteDatabase }> | null = null;

// ─── Helper: Pobranie poprawnej natywnej ścieżki SQLite ───────────────────────

function getSQLiteDirectory(): string {
  if (!defaultDatabaseDirectory) {
    throw new DatabaseInitError('defaultDatabaseDirectory z expo-sqlite jest niedostępny.');
  }
  // Wymuszenie prefixu file:// dla expo-file-system
  const dir = defaultDatabaseDirectory.replace(/\/$/, '');
  return dir.startsWith('file://') ? dir : `file://${dir}`;
}

// ─── Init Function ────────────────────────────────────────────────────────────

export async function initDatabase(): Promise<{
  marketDb: SQLiteDatabase;
  userDb: SQLiteDatabase;
}> {
  if (_marketDb && _userDb) return { marketDb: _marketDb, userDb: _userDb };
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const sqliteDirUri = getSQLiteDirectory();

      const dirInfo = await FileSystem.getInfoAsync(sqliteDirUri);
      console.log('[DB] dir info:', dirInfo);

      if (dirInfo.exists && !dirInfo.isDirectory) {
        console.log('[DB] SQLite to plik, usuwam i tworzę katalog');
        await FileSystem.deleteAsync(sqliteDirUri, { idempotent: true });
      }

      const dirInfo2 = await FileSystem.getInfoAsync(sqliteDirUri);
      if (!dirInfo2.exists) {
        await FileSystem.makeDirectoryAsync(sqliteDirUri, { intermediates: true });
      }

      console.log('[DB] dir po naprawie:', await FileSystem.getInfoAsync(sqliteDirUri));
      console.log('[DB] opening user.db');

      

      const userDb = await openDatabaseAsync(USER_DB_FILENAME);
      console.log('[DB] user.db OK');

      await userDb.execAsync(CREATE_APP_META_TABLE);

      const cols = await userDb.getAllAsync<{ name: string }>(
        'PRAGMA table_info(user_collection)'
      );
      const colNames = cols.map((c) => c.name);
      const needsRebuild =
        cols.length > 0 &&
        (!colNames.includes('fig_num') || colNames.includes('purchase_date'));
      if (needsRebuild) {
        console.log('[DB] Migracja: usuwam starą tabelę user_collection (purchase_date removed)');
        await userDb.execAsync('DROP INDEX IF EXISTS idx_user_collection_bricklink_id;');
        await userDb.execAsync('DROP INDEX IF EXISTS idx_user_collection_fig_num;');
        await userDb.execAsync('DROP TABLE IF EXISTS user_collection;');
      }

      await userDb.execAsync(CREATE_USER_COLLECTION_TABLE);
      await userDb.execAsync(CREATE_USER_COLLECTION_INDEX);

      // 2. Wskazanie dokładnego katalogu bazy w expo-sqlite (Library/SQLite na iOS)
      
      
      

      const targetUri = `${sqliteDirUri}/${MARKET_DB_FILENAME}`;
      const targetInfo = await FileSystem.getInfoAsync(targetUri);

      // Sprawdzenie wersji bazy w app_meta
      const metaRow = await userDb.getFirstAsync<{ value: string } | null>(
        'SELECT value FROM app_meta WHERE key = ?',
        [MARKET_DB_VERSION_KEY]
      );
      const storedVersion = metaRow?.value ?? null;

      const isMissingOrEmpty =
        !targetInfo.exists || (targetInfo.exists && (targetInfo.size ?? 0) === 0);

      if (isMissingOrEmpty || storedVersion !== CURRENT_MARKET_DB_VERSION) {
        console.log('[DB] Kopiowanie lego_sw_market.db do natywnego katalogu SQLite...');

        if (targetInfo.exists) {
          await FileSystem.deleteAsync(targetUri, { idempotent: true });
        }

        const asset = Asset.fromModule(
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('../../assets/lego_sw_market.db') as number
        );
        await asset.downloadAsync();

        if (!asset.localUri) {
          throw new DatabaseInitError('Nie udało się uzyskać localUri dla bazy w assetach.');
        }

        // Kopiowanie pliku binarnego bezpośrednio tam, gdzie expo-sqlite go oczekuje
        await FileSystem.copyAsync({
          from: asset.localUri,
          to: targetUri,
        });

        await userDb.runAsync(
          'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
          [MARKET_DB_VERSION_KEY, CURRENT_MARKET_DB_VERSION]
        );
        console.log('[DB] Plik bazy rynkowej został skopiowany w poprawne miejsce!');
      }

      // 3. Otwarcie bazy rynkowej w natywnym katalogu expo-sqlite
      console.log('[DB] market file:', await FileSystem.getInfoAsync(targetUri));
      console.log('[DB] opening market');
      const marketDb = await openDatabaseAsync(MARKET_DB_FILENAME);

      _marketDb = marketDb;
      _userDb = userDb;
      return { marketDb, userDb };
    } catch (err) {
      _initPromise = null;
      console.error('[DB Init Error]:', err);
      if (err instanceof DatabaseInitError) throw err;
      throw new DatabaseInitError(
        `Inicjalizacja bazy nie powiodła się: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  })();

  return _initPromise;
}

export function getMarketDb(): SQLiteDatabase {
  if (!_marketDb) throw new DatabaseInitError('Market DB nie została zainicjalizowana.');
  return _marketDb;
}

export function getUserDb(): SQLiteDatabase {
  if (!_userDb) throw new DatabaseInitError('User DB nie została zainicjalizowana.');
  return _userDb;
}