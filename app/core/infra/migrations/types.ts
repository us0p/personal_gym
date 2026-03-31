/**
 * A single, ordered schema change.
 * `version` must match the file's numeric prefix (001 → 1, 002 → 2, …).
 * `up` receives the IDBDatabase inside the versionchange transaction —
 * only DDL operations (createObjectStore / deleteObjectStore / createIndex)
 * are allowed here.
 */
interface Migration {
	readonly version: number;
	readonly description: string;
	up(db: IDBDatabase): void;
}

export type { Migration };
