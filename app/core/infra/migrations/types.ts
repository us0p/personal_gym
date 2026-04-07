/**
 * A single, ordered schema change.
 * `version` must match the file's numeric prefix (001 → 1, 002 → 2, …).
 * `up` receives both the IDBDatabase and the active versionchange transaction.
 * DDL (createObjectStore / deleteObjectStore) must go through `db`;
 * DML (reading / writing existing records) must go through `tx`.
 */
interface Migration {
	readonly version: number;
	readonly description: string;
	up(db: IDBDatabase, tx: IDBTransaction): void;
}

export type { Migration };
