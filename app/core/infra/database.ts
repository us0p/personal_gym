import { DATABASE_VERSION } from './config';
import { migrations } from './migrations';

class DBError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DBError';
	}
}

class Database {
	private static instancePromise: Promise<Database> | null = null;
	private db: IDBDatabase;

	private static readonly DB_NAME = 'gym';

	/** The target schema version, sourced from config.ts. */
	static get latestVersion(): number {
		return DATABASE_VERSION;
	}

	private constructor(database: IDBDatabase) {
		this.db = database;
	}

	// ─── Lifecycle ──────────────────────────────────────────────────────────────

	/**
	 * Returns the application-wide singleton.
	 * Uses the global `indexedDB` — only call this in a browser context.
	 */
	static async getInstance(): Promise<Database> {
		if (!Database.instancePromise) {
			Database.instancePromise = Database.openConnection(
				Database.latestVersion,
				indexedDB,
			).then((db) => new Database(db));
		}
		return Database.instancePromise;
	}

	/**
	 * Creates an isolated Database instance with an explicit factory.
	 * Intended for testing — each test should pass `new IDBFactory()` from
	 * `fake-indexeddb` so tests do not share state.
	 *
	 * @param factory  An IDBFactory implementation (real or fake).
	 * @param version  Schema version to open at. Defaults to `latestVersion`.
	 */
	static async createInstance(
		factory: IDBFactory,
		version = Database.latestVersion,
	): Promise<Database> {
		const db = await Database.openConnection(version, factory);
		return new Database(db);
	}

	/** Closes the underlying connection. Required before reopening at a higher version. */
	close(): void {
		this.db.close();
	}

	// ─── Connection & migration runner ──────────────────────────────────────────

	private static openConnection(
		version: number,
		factory: IDBFactory,
	): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const req = factory.open(Database.DB_NAME, version);

			req.onerror = () =>
				reject(new DBError(req.error?.message ?? 'Failed to open database'));

			req.onblocked = () =>
				reject(new DBError('Database upgrade blocked — close other tabs'));

			req.onupgradeneeded = (event: IDBVersionChangeEvent) => {
				Database.runMigrations(req.result, event.oldVersion, event.newVersion ?? version);
			};

			req.onsuccess = () => resolve(req.result);
		});
	}

	/**
	 * Applies every migration whose version falls in the range
	 * (oldVersion, newVersion], in ascending order.
	 *
	 * This means:
	 *   - Fresh install (oldVersion = 0): all migrations run.
	 *   - Returning user (e.g. oldVersion = 1, newVersion = 3): only
	 *     migrations 2 and 3 run — migration 1 is already applied.
	 */
	private static runMigrations(
		db: IDBDatabase,
		oldVersion: number,
		newVersion: number,
	): void {
		const pending = migrations.filter(
			(m) => m.version > oldVersion && m.version <= newVersion,
		);

		for (const migration of pending) {
			migration.up(db);
		}
	}

	// ─── CRUD ────────────────────────────────────────────────────────────────────

	/** Inserts a new record. Rejects if the key already exists. */
	add(storeName: string, value: object): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const tx = this.db.transaction(storeName, 'readwrite');
				tx.onerror = () => reject(new DBError(tx.error?.message ?? 'Transaction error'));
				tx.oncomplete = () => resolve();
				tx.objectStore(storeName).add(value);
			} catch (e) {
				reject(new DBError((e as Error).message ?? 'Transaction error'));
			}
		});
	}

	/** Inserts or replaces a record (upsert). */
	put(storeName: string, value: object): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const tx = this.db.transaction(storeName, 'readwrite');
				tx.onerror = () => reject(new DBError(tx.error?.message ?? 'Transaction error'));
				tx.oncomplete = () => resolve();
				tx.objectStore(storeName).put(value);
			} catch (e) {
				reject(new DBError((e as Error).message ?? 'Transaction error'));
			}
		});
	}

	/** Returns all records in a store. */
	getAll<T>(storeName: string): Promise<T[]> {
		return new Promise((resolve, reject) => {
			try {
				const tx = this.db.transaction(storeName, 'readonly');
				tx.onerror = () => reject(new DBError(tx.error?.message ?? 'Transaction error'));
				const req = tx.objectStore(storeName).getAll();
				req.onsuccess = () => resolve(req.result as T[]);
			} catch (e) {
				reject(new DBError((e as Error).message ?? 'Transaction error'));
			}
		});
	}

	/** Returns a single record by primary key, or `undefined` if not found. */
	get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
		return new Promise((resolve, reject) => {
			try {
				const tx = this.db.transaction(storeName, 'readonly');
				tx.onerror = () => reject(new DBError(tx.error?.message ?? 'Transaction error'));
				const req = tx.objectStore(storeName).get(key);
				req.onsuccess = () => resolve(req.result as T | undefined);
			} catch (e) {
				reject(new DBError((e as Error).message ?? 'Transaction error'));
			}
		});
	}

	/** Deletes a record by primary key. Silent if the key does not exist. */
	delete(storeName: string, key: IDBValidKey): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const tx = this.db.transaction(storeName, 'readwrite');
				tx.onerror = () => reject(new DBError(tx.error?.message ?? 'Transaction error'));
				tx.oncomplete = () => resolve();
				tx.objectStore(storeName).delete(key);
			} catch (e) {
				reject(new DBError((e as Error).message ?? 'Transaction error'));
			}
		});
	}

	/** @deprecated Use `add()` instead. */
	addToObjectStore(storeName: string, value: object): Promise<void> {
		return this.add(storeName, value);
	}
}

export { DBError };
export default Database;
