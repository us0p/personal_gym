import Database from '../infra/database';

const EXPORT_STORES = ['users', 'workout', 'exercise', 'execution', 'userWeightProgression', 'userStrike', 'exerciseNote'] as const;

const UPSERT_STORES = ['users', 'execution', 'userWeightProgression', 'userStrike', 'exerciseNote'] as const;
const APPEND_STORES = ['workout', 'exercise'] as const;

type ExportStoreName = (typeof EXPORT_STORES)[number];

export type ExportData = Partial<Record<ExportStoreName, unknown[]>>;

export class DataPortService {
	constructor(private readonly db: Database) {}

	/** Reads all records from every store and returns a plain export object. */
	async exportAll(): Promise<ExportData> {
		const result: ExportData = {};
		for (const store of EXPORT_STORES) {
			result[store] = await this.db.getAll(store);
		}
		return result;
	}

	/**
	 * Imports data from an export object.
	 * - Records in upsert stores are inserted or overwritten.
	 * - Records in append stores are added only if no record with the same key already exists.
	 * Throws if `data` is not a non-null, non-array object.
	 */
	async importAll(data: unknown): Promise<void> {
		if (typeof data !== 'object' || data === null || Array.isArray(data)) {
			throw new Error('Invalid import format: expected a JSON object');
		}
		const input = data as Record<string, unknown>;

		for (const store of UPSERT_STORES) {
			const records = input[store];
			if (!Array.isArray(records)) continue;
			for (const record of records) {
				await this.db.put(store, record);
			}
		}

		for (const store of APPEND_STORES) {
			const records = input[store];
			if (!Array.isArray(records)) continue;
			for (const record of records) {
				const key = (record as Record<string, unknown>).name as string;
				if (!(await this.db.get(store, key))) {
					await this.db.add(store, record);
				}
			}
		}
	}
}
