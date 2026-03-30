class DBError extends Error { }

class Database {
	private static instancePromise: Promise<Database>;
	private db: IDBDatabase;

	private static DB_NAME: string = 'gym';

	private constructor(database: IDBDatabase) {
		this.db = database;
	}

	static async getInstance(): Promise<Database> {
		if (!Database.instancePromise) {
			// returning promise to avoid race conditions.
			Database.instancePromise = Database.openConnection()
				.then((dbInstance) => new Database(dbInstance));
		}

		return Database.instancePromise;
	}

	private static async openConnection(version: number = 1): Promise<IDBDatabase> {
		return new Promise((res, rej) => {
			const dbConnReq = indexedDB.open(Database.DB_NAME, version);

			dbConnReq.onerror = () => {
				rej(new DBError(dbConnReq.error?.message || 'Failed to open DB'))
			}

			dbConnReq.onblocked = () => {
				rej(new DBError('Database upgrade blocked, close other tabs'));
			}

			dbConnReq.onupgradeneeded = () => {
				Database.migrateSchemaVersion(dbConnReq.result, version);
			}

			dbConnReq.onsuccess = () => {
				res(dbConnReq.result);
			}
		})
	}

	private static migrateSchemaVersion(db: IDBDatabase, version: number) {
		switch (version) {
			case 1:
				db.createObjectStore('users', { keyPath: 'username' });
				db.createObjectStore('workout', { keyPath: 'name' });
				db.createObjectStore('workoutGroup', { keyPath: 'name' });
				db.createObjectStore('set', { keyPath: 'id', autoIncrement: true });
		}
	}

	public async addToObjectStore(storeName: string, value: object): Promise<void> {
		return new Promise((res, rej) => {
			const tx = this.db.transaction(storeName, 'readwrite')
			tx.onerror = () => rej(new DBError(tx.error?.message || 'Error while creating transaction'));
			tx.oncomplete = () => res()
			const objectStore = tx.objectStore(storeName)
			objectStore.add(value)
		})
	}
}

export default Database;
