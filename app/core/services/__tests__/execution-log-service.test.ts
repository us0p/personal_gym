import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../infra/database';
import { ExecutionLogService } from '../execution-log-service';
import { ExecutionRepository } from '../../entities/execution/execution-repository';
import { UserStrikeRepository } from '../../entities/user/user-strike-repository';

let db: Database;
let service: ExecutionLogService;
let executionRepo: ExecutionRepository;
let strikeRepo: UserStrikeRepository;

beforeEach(async () => {
	db = await Database.createInstance(new IDBFactory());
	service = new ExecutionLogService(db);
	executionRepo = new ExecutionRepository(db);
	strikeRepo = new UserStrikeRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── execution storage ────────────────────────────────────────────────────────

describe('execution storage', () => {
	it('stores an execution with reps metric', async () => {
		await service.log('alice', 'Push Day', 'Bench Press', ['reps'], { repNumber: 8 });
		const all = await executionRepo.getAll();
		expect(all).toHaveLength(1);
		expect(all[0].repNumber).toBe(8);
		expect(all[0].weightKg).toBeUndefined();
	});

	it('stores an execution with weight metric', async () => {
		await service.log('alice', 'Push Day', 'Bench Press', ['weight'], { weightKg: 100 });
		const all = await executionRepo.getAll();
		expect(all[0].weightKg).toBe(100);
		expect(all[0].repNumber).toBeUndefined();
	});

	it('stores an execution with reps and weight metrics', async () => {
		await service.log('alice', 'Push Day', 'Bench Press', ['reps', 'weight'], { repNumber: 8, weightKg: 100 });
		const all = await executionRepo.getAll();
		expect(all[0].repNumber).toBe(8);
		expect(all[0].weightKg).toBe(100);
	});

	it('stores an execution with duration metric (cardio)', async () => {
		await service.log('alice', 'Cardio', 'Running', ['duration'], { durationMin: 30 });
		const all = await executionRepo.getAll();
		expect(all[0].durationMin).toBe(30);
		expect(all[0].distanceKm).toBeUndefined();
	});

	it('stores an execution with time metric (static)', async () => {
		await service.log('alice', 'Core', 'Plank', ['time'], { durationSec: 60 });
		const all = await executionRepo.getAll();
		expect(all[0].durationSec).toBe(60);
		expect(all[0].durationMin).toBeUndefined();
	});

	it('stores an execution with distance metric', async () => {
		await service.log('alice', 'Cardio', 'Running', ['duration', 'distance'], { durationMin: 30, distanceKm: 5 });
		const all = await executionRepo.getAll();
		expect(all[0].distanceKm).toBe(5);
	});

	it('omits metric fields that are not in the metrics list', async () => {
		await service.log('alice', 'Push Day', 'Bench Press', ['reps'], { repNumber: 8, weightKg: 100 });
		const all = await executionRepo.getAll();
		expect(all[0].repNumber).toBe(8);
		expect(all[0].weightKg).toBeUndefined();
	});

	it('assigns the correct workoutName, exerciseName and username', async () => {
		await service.log('alice', 'Push Day', 'Bench Press', ['reps'], { repNumber: 5 });
		const all = await executionRepo.getAll();
		expect(all[0].workoutName).toBe('Push Day');
		expect(all[0].exerciseName).toBe('Bench Press');
		expect(all[0].username).toBe('alice');
	});

	it('sets a timestamp on each execution', async () => {
		await service.log('alice', 'Push Day', 'Bench Press', ['reps'], { repNumber: 5 });
		const all = await executionRepo.getAll();
		expect(all[0].timestamp).toBeTruthy();
		expect(() => new Date(all[0].timestamp)).not.toThrow();
	});
});

// ─── strike tracking ──────────────────────────────────────────────────────────

describe('strike tracking', () => {
	it('returns strikeIncreased=true on first log', async () => {
		const result = await service.log('alice', 'Push Day', 'Bench Press', ['reps'], { repNumber: 8 });
		expect(result.strikeIncreased).toBe(true);
		expect(result.strikeCount).toBe(1);
	});

	it('returns strikeIncreased=false when logging twice in the same day', async () => {
		await service.log('alice', 'Push Day', 'Bench Press', ['reps'], { repNumber: 8 });
		const result = await service.log('alice', 'Push Day', 'Bench Press', ['reps'], { repNumber: 10 });
		expect(result.strikeIncreased).toBe(false);
		expect(result.strikeCount).toBe(1);
	});

	it('persists the strike to the database', async () => {
		await service.log('alice', 'Push Day', 'Bench Press', ['reps'], { repNumber: 8 });
		const strike = await strikeRepo.get('alice');
		expect(strike?.strikeCount).toBe(1);
	});
});
