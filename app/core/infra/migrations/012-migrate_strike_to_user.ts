import type { Migration } from './types';

const migration: Migration = {
	version: 12,
	description: 'Migrate strike/maxStrike onto User record and drop userStrike store',
	up(db, tx) {
		const strikeStore = tx.objectStore('userStrike');

		strikeStore.getAll().onsuccess = (evt) => {
			const strikes = (evt.target as IDBRequest<Array<{ username: string; strikeCount: number; maxStrike: number }>>).result;
			const strikeMap = new Map(strikes.map((s) => [s.username, s]));

			const userStore = tx.objectStore('users');
			userStore.getAll().onsuccess = (evt2) => {
				const users = (evt2.target as IDBRequest<Array<Record<string, unknown>>>).result;
				for (const user of users) {
					const strike = strikeMap.get(user['username'] as string);
					userStore.put({
						...user,
						strike: strike?.strikeCount ?? 0,
						maxStrike: strike?.maxStrike ?? 0,
					});
				}
				db.deleteObjectStore('userStrike');
			};
		};
	},
};

export default migration;
