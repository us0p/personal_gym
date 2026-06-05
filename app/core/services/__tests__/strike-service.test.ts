import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../infra/database';
import { StrikeService } from '../strike-service';
import { UserRepository } from '../../entities/user/user-repository';
import { WorkoutConfigRepository } from '../../entities/workout-config/workout-config-repository';
import { SexOptions } from '../../entities/user/user';

let db: Database;
let today: string;
let service: StrikeService;
let userRepo: UserRepository;
let configRepo: WorkoutConfigRepository;

const baseUser = {
	username: 'alice',
	sex: SexOptions.FEMALE,
	birthDate: new Date('1996-01-15'),
	height: 165,
	strike: 0,
	maxStrike: 0,
};

function mockDate(dateStr: string) {
	today = dateStr;
}

beforeEach(async () => {
	today = '2026-01-01';
	db = await Database.createInstance(new IDBFactory());
	service = new StrikeService(db, () => today);
	userRepo = new UserRepository(db);
	configRepo = new WorkoutConfigRepository(db);
});

afterEach(() => {
	db.close();
});

async function getStrike() {
	const user = await userRepo.get();
	return { strike: user?.strike ?? 0, maxStrike: user?.maxStrike ?? 0 };
}

// ─── No config ────────────────────────────────────────────────────────────────

describe('no config', () => {
	beforeEach(async () => { await userRepo.create(baseUser); });

	it('returns false when no config exists', async () => {
		const result = await service.onExerciseLogged('alice', 'Push Day');
		expect(result.strikeIncreased).toBe(false);
	});

	it('onAppOpen is no-op when no config exists', async () => {
		await service.onAppOpen('alice');
		expect((await getStrike()).strike).toBe(0);
	});

	it('returns false when no user exists', async () => {
		const result = await service.onExerciseLogged('nobody', 'Push');
		expect(result.strikeIncreased).toBe(false);
	});
});

// ─── Sequential — 3 workout + 2 rest cycle ────────────────────────────────────

describe('sequential — 3 workout + 2 rest cycle', () => {
	// Cycle: [W, W, W, R, R] — any workout name is valid on workout days
	const config = {
		username: 'alice',
		routineType: 'sequential' as const,
		entries: [
			{ type: 'workout' as const, workoutName: 'Workout1' },
			{ type: 'workout' as const, workoutName: 'Workout2' },
			{ type: 'workout' as const, workoutName: 'Workout3' },
			{ type: 'rest' as const },
			{ type: 'rest' as const },
		],
		tracking: null,
	};

	beforeEach(async () => {
		await userRepo.create(baseUser);
		await configRepo.upsert(config);
	});

	it('credits on first log regardless of workout name', async () => {
		mockDate('2026-01-01');
		// Log Workout3 on day 1 — first in cycle is Workout1, but any name is ok
		const result = await service.onExerciseLogged('alice', 'Workout3');
		expect(result.strikeIncreased).toBe(true);
		expect(result.strikeCount).toBe(1);
	});

	it('credits on consecutive workout days with different workout names', async () => {
		mockDate('2026-01-01');
		await service.onExerciseLogged('alice', 'Workout3'); // day 1 → strike=1

		mockDate('2026-01-02');
		const r2 = await service.onExerciseLogged('alice', 'Workout1'); // day 2 → strike=2
		expect(r2.strikeIncreased).toBe(true);
		expect(r2.strikeCount).toBe(2);

		mockDate('2026-01-03');
		const r3 = await service.onExerciseLogged('alice', 'Workout2'); // day 3 → strike=3
		expect(r3.strikeIncreased).toBe(true);
		expect(r3.strikeCount).toBe(3);
	});

	it('auto-credits rest days on app open (strike > 0)', async () => {
		mockDate('2026-01-01');
		await service.onExerciseLogged('alice', 'A'); // day 1 = W → strike=1
		mockDate('2026-01-02');
		await service.onExerciseLogged('alice', 'B'); // day 2 = W → strike=2
		mockDate('2026-01-03');
		await service.onExerciseLogged('alice', 'C'); // day 3 = W → strike=3

		mockDate('2026-01-04');
		await service.onAppOpen('alice'); // day 4 = R → strike=4
		expect((await getStrike()).strike).toBe(4);

		mockDate('2026-01-05');
		await service.onAppOpen('alice'); // day 5 = R → strike=5
		expect((await getStrike()).strike).toBe(5);
	});

	it('credits rest day when user logs on a rest day (any log on rest = strike++)', async () => {
		mockDate('2026-01-01');
		await service.onExerciseLogged('alice', 'A');
		mockDate('2026-01-02');
		await service.onExerciseLogged('alice', 'B');
		mockDate('2026-01-03');
		await service.onExerciseLogged('alice', 'C'); // strike=3, now on rest days

		mockDate('2026-01-04'); // day 4 = R
		const result = await service.onExerciseLogged('alice', 'Extra'); // log on rest day
		expect(result.strikeIncreased).toBe(true);
		expect(result.strikeCount).toBe(4);
	});

	it('retroactively credits skipped rest days (no workout missed)', async () => {
		mockDate('2026-01-01');
		await service.onExerciseLogged('alice', 'A');
		mockDate('2026-01-02');
		await service.onExerciseLogged('alice', 'B');
		mockDate('2026-01-03');
		await service.onExerciseLogged('alice', 'C'); // strike=3

		// Skip rest days 4 and 5 — log on day 6 (next W, cycle wraps)
		mockDate('2026-01-06');
		const result = await service.onExerciseLogged('alice', 'A');
		// days 4 and 5 were rest → both credited, then today (+1) = +3 total
		expect(result.strikeIncreased).toBe(true);
		expect(result.strikeCount).toBe(6);
	});

	it('resets strike when a workout day is missed', async () => {
		mockDate('2026-01-01');
		await service.onExerciseLogged('alice', 'A'); // day1 W → strike=1

		// Skip day 2 (W) — open app on day 3 (W, still a workout day)
		mockDate('2026-01-03');
		await service.onAppOpen('alice');
		expect((await getStrike()).strike).toBe(0);
	});

	it('is idempotent on same-day repeat logs', async () => {
		mockDate('2026-01-01');
		await service.onExerciseLogged('alice', 'A');
		const result = await service.onExerciseLogged('alice', 'B'); // same day
		expect(result.strikeIncreased).toBe(false);
		expect(result.strikeCount).toBe(1);
	});

	it('full 5-day cycle completes correctly', async () => {
		for (let i = 0; i < 3; i++) {
			mockDate(`2026-01-0${i + 1}`);
			await service.onExerciseLogged('alice', 'X');
		}
		// days 4, 5 = rest
		mockDate('2026-01-05');
		await service.onAppOpen('alice'); // credits days 4 and 5

		const { strike } = await getStrike();
		expect(strike).toBe(5);
	});
});

// ─── Sequential — rest day with strike = 0 ───────────────────────────────────

describe('sequential — rest day with strike = 0', () => {
	const config = {
		username: 'alice',
		routineType: 'sequential' as const,
		entries: [
			{ type: 'workout' as const, workoutName: 'Push' },
			{ type: 'rest' as const },
			{ type: 'workout' as const, workoutName: 'Pull' },
		],
		tracking: null,
	};

	beforeEach(async () => {
		await userRepo.create(baseUser);
		await configRepo.upsert(config);
	});

	it('appOpen on rest day when strike=0 does nothing (no tracking set)', async () => {
		// Before first log, tracking is null; first cycle entry is workout → appOpen is no-op
		mockDate('2026-01-01');
		await service.onAppOpen('alice');
		expect((await getStrike()).strike).toBe(0);
		expect((await configRepo.get('alice'))?.tracking).toBeNull();
	});

	it('rest day after a reset does not credit strike', async () => {
		// Log Push Day → track at index 0, strike=1
		mockDate('2026-01-01');
		await service.onExerciseLogged('alice', 'Push'); // strike=1, index=0

		// Miss Pull Day (day 3 = index 2 = workout) → reset on day 4
		mockDate('2026-01-04');
		await service.onAppOpen('alice'); // detects day 3 (Pull Day) missed → reset
		expect((await getStrike()).strike).toBe(0);

		// Day 5 would be rest (index 1 of the cycle). Log something → strike=0, shouldn't credit
		// But tracking was reset to null, so first interaction restarts from workout index
		// No rest day credit possible while strike=0
		mockDate('2026-01-05');
		const result = await service.onExerciseLogged('alice', 'Push'); // restarts from first workout
		// First workout log always succeeds (strike 0 → 1)
		expect(result.strikeIncreased).toBe(true);
		expect(result.strikeCount).toBe(1);
	});

	it('rest day after rest day with strike=0 still does not credit', async () => {
		// Cycle with leading rest: [R, W, R, W]
		const restFirstConfig = {
			username: 'alice',
			routineType: 'sequential' as const,
			entries: [
				{ type: 'rest' as const },
				{ type: 'workout' as const, workoutName: 'Push' },
			],
			tracking: { lastCreditedDate: '2025-12-31', lastCreditedIndex: 0 },
		};
		await configRepo.upsert(restFirstConfig);

		// day 1 = index 1 = workout (first entry was rest at index 0, credited on 2025-12-31)
		// But wait — lastCreditedIndex=0 (rest), strike=0
		// App opens on 2026-01-01 (day 1 after lastCreditedDate)
		// Expected: index (0+1)%2 = 1 = workout — do nothing (not a log event)
		mockDate('2026-01-01');
		await service.onAppOpen('alice');
		expect((await getStrike()).strike).toBe(0); // still 0, workout day not logged

		// Now log → credits workout day
		const result = await service.onExerciseLogged('alice', 'Push');
		expect(result.strikeIncreased).toBe(true);
		expect(result.strikeCount).toBe(1);
	});
});

// ─── Scheduled — Mon–Fri alternating ─────────────────────────────────────────
// 2026-01-05 = Monday, 2026-01-06 = Tuesday, ..., 2026-01-11 = Sunday

describe('scheduled — Mon–Fri alternating workout/rest', () => {
	// Mon=W, Tue=R, Wed=W, Thu=R, Fri=W, Sat=R, Sun=R
	const scheduledConfig = {
		username: 'alice',
		routineType: 'scheduled' as const,
		entries: [
			{ type: 'workout' as const, workoutName: 'Push', weekDay: 'MONDAY' as const },
			{ type: 'rest' as const, weekDay: 'TUESDAY' as const },
			{ type: 'workout' as const, workoutName: 'Pull', weekDay: 'WEDNESDAY' as const },
			{ type: 'rest' as const, weekDay: 'THURSDAY' as const },
			{ type: 'workout' as const, workoutName: 'Legs', weekDay: 'FRIDAY' as const },
			{ type: 'rest' as const, weekDay: 'SATURDAY' as const },
			{ type: 'rest' as const, weekDay: 'SUNDAY' as const },
		],
		tracking: null,
	};

	beforeEach(async () => {
		await userRepo.create(baseUser);
		await configRepo.upsert(scheduledConfig);
	});

	it('credits any workout logged on a workout day', async () => {
		mockDate('2026-01-05'); // Monday
		const result = await service.onExerciseLogged('alice', 'SomeOtherWorkout');
		expect(result.strikeIncreased).toBe(true);
		expect(result.strikeCount).toBe(1);
	});

	it('credits logging on a rest day when strike > 0', async () => {
		mockDate('2026-01-05'); // Monday → strike=1
		await service.onExerciseLogged('alice', 'Push');

		mockDate('2026-01-06'); // Tuesday = rest
		const result = await service.onExerciseLogged('alice', 'AnyWorkout');
		expect(result.strikeIncreased).toBe(true);
		expect(result.strikeCount).toBe(2);
	});

	it('credits appOpen on rest day when strike > 0', async () => {
		mockDate('2026-01-05');
		await service.onExerciseLogged('alice', 'Push'); // strike=1

		mockDate('2026-01-06'); // Tuesday = rest
		await service.onAppOpen('alice');
		expect((await getStrike()).strike).toBe(2);
	});

	it('auto-credits skipped rest days when no workout was missed', async () => {
		mockDate('2026-01-05'); // Mon → strike=1
		await service.onExerciseLogged('alice', 'Push');

		// Skip Tuesday (rest), log on Wednesday
		mockDate('2026-01-07'); // Wednesday
		const result = await service.onExerciseLogged('alice', 'X');
		// Tue rest (+1) + Wed workout (+1) = strike=3
		expect(result.strikeIncreased).toBe(true);
		expect(result.strikeCount).toBe(3);
	});

	it('resets when a scheduled workout day is missed', async () => {
		mockDate('2026-01-05'); // Mon → strike=1
		await service.onExerciseLogged('alice', 'Push');

		// Skip Wednesday (workout day) — detect on Thursday
		mockDate('2026-01-08'); // Thursday = rest
		await service.onAppOpen('alice');
		expect((await getStrike()).strike).toBe(0);
	});

	it('resets when a workout day is missed even if later day is also a workout day', async () => {
		mockDate('2026-01-05'); // Mon → strike=1
		await service.onExerciseLogged('alice', 'Push');

		// Skip both Wed and Fri (workout days) — try to log on the following Monday
		mockDate('2026-01-12'); // next Monday = workout
		const result = await service.onExerciseLogged('alice', 'Push');
		// Wednesday was missed → reset → strike=0
		// After reset, tracking is null; next log starts fresh
		expect(result.strikeCount).toBe(0);
	});

	it('is idempotent on same-day repeat logs', async () => {
		mockDate('2026-01-05');
		await service.onExerciseLogged('alice', 'Push');
		const result = await service.onExerciseLogged('alice', 'Pull');
		expect(result.strikeIncreased).toBe(false);
		expect(result.strikeCount).toBe(1);
	});

	it('full week cycle: Mon W, Tue R (log), Wed W, Thu R (open), Fri W', async () => {
		mockDate('2026-01-05'); // Mon W
		await service.onExerciseLogged('alice', 'A'); // strike=1

		mockDate('2026-01-06'); // Tue R — log (point 3)
		await service.onExerciseLogged('alice', 'Extra'); // strike=2

		mockDate('2026-01-07'); // Wed W
		await service.onExerciseLogged('alice', 'B'); // strike=3

		mockDate('2026-01-08'); // Thu R — appOpen
		await service.onAppOpen('alice'); // strike=4

		mockDate('2026-01-09'); // Fri W
		await service.onExerciseLogged('alice', 'C'); // strike=5

		expect((await getStrike()).strike).toBe(5);
	});
});

// ─── Scheduled — rest day with strike = 0 ────────────────────────────────────

describe('scheduled — rest day with strike = 0', () => {
	const scheduledConfig = {
		username: 'alice',
		routineType: 'scheduled' as const,
		entries: [
			{ type: 'workout' as const, workoutName: 'Push', weekDay: 'MONDAY' as const },
			{ type: 'rest' as const, weekDay: 'TUESDAY' as const },
			{ type: 'workout' as const, workoutName: 'Pull', weekDay: 'WEDNESDAY' as const },
			{ type: 'rest' as const, weekDay: 'THURSDAY' as const },
			{ type: 'workout' as const, workoutName: 'Legs', weekDay: 'FRIDAY' as const },
			{ type: 'rest' as const, weekDay: 'SATURDAY' as const },
			{ type: 'rest' as const, weekDay: 'SUNDAY' as const },
		],
		tracking: null,
	};

	beforeEach(async () => {
		await userRepo.create(baseUser);
		await configRepo.upsert(scheduledConfig);
	});

	it('appOpen on rest day when strike=0 does nothing (first interaction)', async () => {
		mockDate('2026-01-06'); // Tuesday = rest
		await service.onAppOpen('alice');
		expect((await getStrike()).strike).toBe(0);
		expect((await configRepo.get('alice'))?.tracking).toBeNull();
	});

	it('log on rest day when strike=0 does nothing (first interaction)', async () => {
		mockDate('2026-01-06'); // Tuesday = rest
		const result = await service.onExerciseLogged('alice', 'Push');
		expect(result.strikeIncreased).toBe(false);
		expect(result.strikeCount).toBe(0);
	});

	it('rest day after reset does not credit strike', async () => {
		mockDate('2026-01-05'); // Mon → strike=1
		await service.onExerciseLogged('alice', 'Push');

		// Miss Wednesday (workout day) — detected on Thursday
		mockDate('2026-01-08'); // Thursday = rest
		await service.onAppOpen('alice'); // strike → 0

		// Friday = workout day, can restart
		mockDate('2026-01-09'); // Friday
		const result = await service.onExerciseLogged('alice', 'Legs');
		expect(result.strikeIncreased).toBe(true);
		expect(result.strikeCount).toBe(1);
	});

	it('Saturday rest after reset does not credit (strike=0)', async () => {
		mockDate('2026-01-05'); // Mon → strike=1
		await service.onExerciseLogged('alice', 'Push');

		// Miss Wednesday → reset detected on Thursday
		mockDate('2026-01-08');
		await service.onAppOpen('alice'); // strike=0

		// Saturday = rest, but strike=0 → no credit
		mockDate('2026-01-10'); // Saturday
		await service.onAppOpen('alice');
		expect((await getStrike()).strike).toBe(0);
	});
});

// ─── Both modes — any workout name is accepted ────────────────────────────────

describe('any workout name is accepted', () => {
	it('sequential: logs a workout not in the config entries → still credits', async () => {
		await userRepo.create(baseUser);
		await configRepo.upsert({
			username: 'alice',
			routineType: 'sequential',
			entries: [{ type: 'workout', workoutName: 'Workout1' }],
			tracking: null,
		});
		mockDate('2026-01-01');
		const result = await service.onExerciseLogged('alice', 'CompletelyDifferentWorkout');
		expect(result.strikeIncreased).toBe(true);
	});

	it('scheduled: logs any workout on a scheduled workout day → credits', async () => {
		await userRepo.create(baseUser);
		await configRepo.upsert({
			username: 'alice',
			routineType: 'scheduled',
			entries: [
				{ type: 'workout', workoutName: 'Push', weekDay: 'MONDAY' as const },
				{ type: 'rest', weekDay: 'TUESDAY' as const },
				{ type: 'rest', weekDay: 'WEDNESDAY' as const },
				{ type: 'rest', weekDay: 'THURSDAY' as const },
				{ type: 'rest', weekDay: 'FRIDAY' as const },
				{ type: 'rest', weekDay: 'SATURDAY' as const },
				{ type: 'rest', weekDay: 'SUNDAY' as const },
			],
			tracking: null,
		});
		mockDate('2026-01-05'); // Monday
		const result = await service.onExerciseLogged('alice', 'Yoga'); // not "Push"
		expect(result.strikeIncreased).toBe(true);
	});
});

// ─── maxStrike tracking ───────────────────────────────────────────────────────

describe('maxStrike tracking', () => {
	it('updates maxStrike when new streak exceeds it', async () => {
		await userRepo.create(baseUser);
		await configRepo.upsert({
			username: 'alice',
			routineType: 'sequential',
			entries: [{ type: 'workout', workoutName: 'A' }],
			tracking: null,
		});
		mockDate('2026-01-01');
		await service.onExerciseLogged('alice', 'A'); // strike=1, maxStrike=1
		mockDate('2026-01-02');
		await service.onExerciseLogged('alice', 'A'); // strike=2, maxStrike=2

		const { maxStrike } = await getStrike();
		expect(maxStrike).toBe(2);
	});

	it('preserves maxStrike after reset', async () => {
		await userRepo.create(baseUser);
		await configRepo.upsert({
			username: 'alice',
			routineType: 'sequential',
			entries: [
				{ type: 'workout', workoutName: 'A' },
				{ type: 'workout', workoutName: 'B' },
			],
			tracking: null,
		});
		mockDate('2026-01-01');
		await service.onExerciseLogged('alice', 'A'); // strike=1, maxStrike=1
		mockDate('2026-01-02');
		await service.onExerciseLogged('alice', 'B'); // strike=2, maxStrike=2

		// Miss day 3 (A) — reset
		mockDate('2026-01-04');
		await service.onAppOpen('alice'); // reset

		const { strike, maxStrike } = await getStrike();
		expect(strike).toBe(0);
		expect(maxStrike).toBe(2); // preserved
	});
});
