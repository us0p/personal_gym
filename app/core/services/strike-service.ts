import Database from '../infra/database';
import { UserRepository } from '../entities/user/user-repository';
import { WorkoutConfigRepository } from '../entities/workout-config/workout-config-repository';
import type { WorkoutConfig, RoutineEntry } from '../entities/workout-config/workout-config';
import type { User } from '../entities/user/user';
import type { WeekDay } from '../entities/workout/workout';

export interface StrikeResult {
	strikeIncreased: boolean;
	strikeCount: number;
}

/** Returns 'YYYY-MM-DD' in local time. */
function toLocalDateString(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/** Parses a 'YYYY-MM-DD' string as local midnight (avoids UTC offset shifting). */
function parseLocalDate(dateStr: string): Date {
	const [y, m, d] = dateStr.split('-').map(Number);
	return new Date(y, m - 1, d);
}

/** Calendar days between two 'YYYY-MM-DD' strings (positive if b > a). */
function calendarDaysBetween(a: string, b: string): number {
	const msPerDay = 24 * 60 * 60 * 1000;
	return Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / msPerDay);
}

/** Add N calendar days to a 'YYYY-MM-DD' string. */
function addDays(dateStr: string, days: number): string {
	const d = parseLocalDate(dateStr);
	d.setDate(d.getDate() + days);
	return toLocalDateString(d);
}

/** Returns the weekday name for a 'YYYY-MM-DD' string. */
function weekDayOf(dateStr: string): WeekDay {
	const days: WeekDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
	return days[parseLocalDate(dateStr).getDay()] as WeekDay;
}

/** Find the index of the first 'workout' entry in the sequence. */
function findFirstWorkoutIndex(entries: RoutineEntry[]): number {
	return entries.findIndex((e) => e.type === 'workout');
}

/** Get the scheduled entry for a given weekday. */
function getScheduledEntry(entries: RoutineEntry[], day: WeekDay): RoutineEntry | undefined {
	return entries.find((e) => e.weekDay === day);
}

async function updateUserStrike(userRepo: UserRepository, user: User, newStrike: number): Promise<void> {
	const newMax = Math.max(newStrike, user.maxStrike);
	await userRepo.updateStrike(user.username, newStrike, newMax);
}

async function resetStrike(userRepo: UserRepository, configRepo: WorkoutConfigRepository, user: User): Promise<void> {
	await userRepo.updateStrike(user.username, 0, user.maxStrike);
	await configRepo.resetTracking(user.username);
}

async function processSequential(
	event: 'appOpen' | 'log',
	user: User,
	config: WorkoutConfig,
	userRepo: UserRepository,
	configRepo: WorkoutConfigRepository,
	today: string,
): Promise<StrikeResult> {
	const { entries, tracking } = config;

	if (entries.length === 0) return { strikeIncreased: false, strikeCount: user.strike };

	// First interaction ever — must be a log event; any workout is valid
	if (tracking === null) {
		if (event !== 'log') return { strikeIncreased: false, strikeCount: user.strike };

		const firstIdx = findFirstWorkoutIndex(entries);
		if (firstIdx === -1) return { strikeIncreased: false, strikeCount: user.strike };

		await configRepo.updateTracking(user.username, { lastCreditedDate: today, lastCreditedIndex: firstIdx });
		const newStrike = user.strike + 1;
		await updateUserStrike(userRepo, user, newStrike);
		return { strikeIncreased: true, strikeCount: newStrike };
	}

	const { lastCreditedDate, lastCreditedIndex } = tracking;

	if (lastCreditedDate === today) return { strikeIncreased: false, strikeCount: user.strike };

	const daysElapsed = calendarDaysBetween(lastCreditedDate, today);
	let strikeGain = 0;
	let pos = lastCreditedIndex;
	let newLastCreditedDate = lastCreditedDate;
	let newLastCreditedIndex = lastCreditedIndex;

	for (let day = 1; day <= daysElapsed; day++) {
		pos = (pos + 1) % entries.length;
		const entry = entries[pos];
		const expectedDate = addDays(lastCreditedDate, day);

		if (entry.type === 'rest') {
			// Always advance position; only credit if streak is already active
			newLastCreditedDate = expectedDate;
			newLastCreditedIndex = pos;
			if (user.strike + strikeGain > 0) {
				strikeGain++;
			}
		} else {
			// workout entry
			if (expectedDate < today) {
				// past workout day was not logged — reset
				await resetStrike(userRepo, configRepo, user);
				return { strikeIncreased: false, strikeCount: 0 };
			}
			// today's workout — any log event credits it
			if (event === 'log') {
				strikeGain++;
				newLastCreditedDate = today;
				newLastCreditedIndex = pos;
			}
			break; // stop — don't look past today's workout
		}
	}

	// Always persist position if it advanced (rest days with strike=0 still advance the cycle)
	if (newLastCreditedDate !== lastCreditedDate) {
		await configRepo.updateTracking(user.username, { lastCreditedDate: newLastCreditedDate, lastCreditedIndex: newLastCreditedIndex });
	}

	if (strikeGain === 0) return { strikeIncreased: false, strikeCount: user.strike };

	const newStrike = user.strike + strikeGain;
	await updateUserStrike(userRepo, user, newStrike);
	return { strikeIncreased: true, strikeCount: newStrike };
}

async function processScheduled(
	event: 'appOpen' | 'log',
	user: User,
	config: WorkoutConfig,
	userRepo: UserRepository,
	configRepo: WorkoutConfigRepository,
	today: string,
): Promise<StrikeResult> {
	const { entries, tracking } = config;

	if (entries.length === 0) return { strikeIncreased: false, strikeCount: user.strike };

	const todayWeekDay = weekDayOf(today);
	const todayEntry = getScheduledEntry(entries, todayWeekDay);

	if (todayEntry === undefined) return { strikeIncreased: false, strikeCount: user.strike };

	// First interaction ever — only a workout-day log can start a streak (rest days require strike > 0)
	if (tracking === null) {
		if (event === 'log' && todayEntry.type === 'workout') {
			await configRepo.updateTracking(user.username, { lastCreditedDate: today, lastCreditedIndex: 0 });
			const newStrike = user.strike + 1;
			await updateUserStrike(userRepo, user, newStrike);
			return { strikeIncreased: true, strikeCount: newStrike };
		}
		return { strikeIncreased: false, strikeCount: user.strike };
	}

	const { lastCreditedDate } = tracking;

	if (lastCreditedDate === today) return { strikeIncreased: false, strikeCount: user.strike };

	const daysElapsed = calendarDaysBetween(lastCreditedDate, today);
	let strikeGain = 0;
	let newLastCreditedDate = lastCreditedDate;

	// Check all days before today
	for (let day = 1; day < daysElapsed; day++) {
		const checkDate = addDays(lastCreditedDate, day);
		const entry = getScheduledEntry(entries, weekDayOf(checkDate));
		if (entry === undefined) continue;
		if (entry.type === 'workout') {
			await resetStrike(userRepo, configRepo, user);
			return { strikeIncreased: false, strikeCount: 0 };
		}
		// rest day — advance position; only credit if streak is active
		newLastCreditedDate = checkDate;
		if (user.strike + strikeGain > 0) {
			strikeGain++;
		}
	}

	// Process today
	let creditedToday = false;
	if (todayEntry.type === 'rest' && (user.strike + strikeGain) > 0) {
		// Rest day credits on both appOpen and log, but only when streak is active
		strikeGain++;
		creditedToday = true;
	} else if (event === 'log' && todayEntry.type === 'workout') {
		// Any workout logged on a workout day counts
		strikeGain++;
		creditedToday = true;
	}

	// Always persist position if it advanced
	if (creditedToday) {
		newLastCreditedDate = today;
	}
	if (newLastCreditedDate !== lastCreditedDate) {
		await configRepo.updateTracking(user.username, { lastCreditedDate: newLastCreditedDate, lastCreditedIndex: 0 });
	}

	if (strikeGain === 0) return { strikeIncreased: false, strikeCount: user.strike };

	const newStrike = user.strike + strikeGain;
	await updateUserStrike(userRepo, user, newStrike);
	return { strikeIncreased: true, strikeCount: newStrike };
}

export class StrikeService {
	private readonly userRepo: UserRepository;
	private readonly configRepo: WorkoutConfigRepository;
	private readonly getToday: () => string;

	constructor(
		private readonly db: Database,
		/** Override for testing. Defaults to today in local time as 'YYYY-MM-DD'. */
		getToday: () => string = () => toLocalDateString(new Date()),
	) {
		this.userRepo = new UserRepository(db);
		this.configRepo = new WorkoutConfigRepository(db);
		this.getToday = getToday;
	}

	/**
	 * Called once per app session after user loads.
	 * Auto-credits rest days and detects missed workout days.
	 */
	async onAppOpen(username: string): Promise<void> {
		const [user, config] = await Promise.all([
			this.userRepo.get(),
			this.configRepo.get(username),
		]);
		if (!user || !config) return;

		const today = this.getToday();

		if (config.routineType === 'sequential') {
			await processSequential('appOpen', user, config, this.userRepo, this.configRepo, today);
		} else {
			await processScheduled('appOpen', user, config, this.userRepo, this.configRepo, today);
		}
	}

	/**
	 * Called immediately after an exercise set is logged.
	 * Returns whether the strike counter increased and its new value.
	 */
	async onExerciseLogged(username: string): Promise<StrikeResult> {
		const [user, config] = await Promise.all([
			this.userRepo.get(),
			this.configRepo.get(username),
		]);
		if (!user) return { strikeIncreased: false, strikeCount: 0 };
		if (!config) return { strikeIncreased: false, strikeCount: user.strike };

		const today = this.getToday();

		if (config.routineType === 'sequential') {
			return processSequential('log', user, config, this.userRepo, this.configRepo, today);
		}
		return processScheduled('log', user, config, this.userRepo, this.configRepo, today);
	}
}
