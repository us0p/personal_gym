import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { ExerciseNoteRepository } from '../exercise-note-repository';

let db: Database;
let repo: ExerciseNoteRepository;

const base = {
	workoutName: 'Push Day',
	exerciseName: 'Plank',
	content: 'Keep hips level',
	timestamp: '2026-01-01T10:00:00.000Z',
};

beforeEach(async () => {
	db = await Database.createInstance(new IDBFactory());
	repo = new ExerciseNoteRepository(db);
});

afterEach(() => {
	db.close();
});

describe('add() / getByWorkoutAndExercise()', () => {
	it('returns an empty array when no notes exist', async () => {
		const notes = await repo.getByWorkoutAndExercise('Push Day', 'Plank');
		expect(notes).toHaveLength(0);
	});

	it('stores a note and retrieves it', async () => {
		await repo.add(base);
		const notes = await repo.getByWorkoutAndExercise('Push Day', 'Plank');
		expect(notes).toHaveLength(1);
		expect(notes[0].content).toBe('Keep hips level');
		expect(notes[0].id).toBeDefined();
	});

	it('filters by workoutName + exerciseName', async () => {
		await repo.add(base);
		await repo.add({ ...base, workoutName: 'Full Body' });
		await repo.add({ ...base, exerciseName: 'Squat' });

		const notes = await repo.getByWorkoutAndExercise('Push Day', 'Plank');
		expect(notes).toHaveLength(1);
	});

	it('returns notes sorted newest first', async () => {
		await repo.add({ ...base, timestamp: '2026-01-01T08:00:00.000Z' });
		await repo.add({ ...base, timestamp: '2026-01-01T12:00:00.000Z' });
		await repo.add({ ...base, timestamp: '2026-01-01T10:00:00.000Z' });

		const notes = await repo.getByWorkoutAndExercise('Push Day', 'Plank');
		expect(notes[0].timestamp).toBe('2026-01-01T12:00:00.000Z');
		expect(notes[2].timestamp).toBe('2026-01-01T08:00:00.000Z');
	});
});

describe('update()', () => {
	it('updates note content and timestamp', async () => {
		const id = await repo.add(base);
		await repo.update({ id, ...base, content: 'Tuck chin', timestamp: '2026-01-02T10:00:00.000Z' });

		const notes = await repo.getByWorkoutAndExercise('Push Day', 'Plank');
		expect(notes[0].content).toBe('Tuck chin');
		expect(notes[0].timestamp).toBe('2026-01-02T10:00:00.000Z');
	});
});

describe('delete()', () => {
	it('removes a note by id', async () => {
		const id = await repo.add(base);
		await repo.delete(id);

		const notes = await repo.getByWorkoutAndExercise('Push Day', 'Plank');
		expect(notes).toHaveLength(0);
	});
});

describe('deleteByExercise()', () => {
	it('removes all notes for a given exercise across workouts', async () => {
		await repo.add(base);
		await repo.add({ ...base, workoutName: 'Full Body' });
		await repo.add({ ...base, exerciseName: 'Squat' });

		await repo.deleteByExercise('Plank');

		expect(await repo.getByWorkoutAndExercise('Push Day', 'Plank')).toHaveLength(0);
		expect(await repo.getByWorkoutAndExercise('Full Body', 'Plank')).toHaveLength(0);
		expect(await repo.getByWorkoutAndExercise('Push Day', 'Squat')).toHaveLength(1);
	});
});

describe('deleteByWorkout()', () => {
	it('removes all notes for a given workout across exercises', async () => {
		await repo.add(base);
		await repo.add({ ...base, exerciseName: 'Squat' });
		await repo.add({ ...base, workoutName: 'Full Body' });

		await repo.deleteByWorkout('Push Day');

		expect(await repo.getByWorkoutAndExercise('Push Day', 'Plank')).toHaveLength(0);
		expect(await repo.getByWorkoutAndExercise('Push Day', 'Squat')).toHaveLength(0);
		expect(await repo.getByWorkoutAndExercise('Full Body', 'Plank')).toHaveLength(1);
	});
});

describe('updateExerciseName()', () => {
	it('renames exerciseName on all matching notes', async () => {
		await repo.add(base);
		await repo.add({ ...base, workoutName: 'Full Body' });
		await repo.add({ ...base, exerciseName: 'Squat' });

		await repo.updateExerciseName('Plank', 'Side Plank');

		expect(await repo.getByWorkoutAndExercise('Push Day', 'Plank')).toHaveLength(0);
		expect(await repo.getByWorkoutAndExercise('Push Day', 'Side Plank')).toHaveLength(1);
		expect(await repo.getByWorkoutAndExercise('Full Body', 'Side Plank')).toHaveLength(1);
		expect(await repo.getByWorkoutAndExercise('Push Day', 'Squat')).toHaveLength(1);
	});
});

describe('updateWorkoutName()', () => {
	it('renames workoutName on all matching notes', async () => {
		await repo.add(base);
		await repo.add({ ...base, exerciseName: 'Squat' });
		await repo.add({ ...base, workoutName: 'Full Body' });

		await repo.updateWorkoutName('Push Day', 'Upper Body');

		expect(await repo.getByWorkoutAndExercise('Push Day', 'Plank')).toHaveLength(0);
		expect(await repo.getByWorkoutAndExercise('Upper Body', 'Plank')).toHaveLength(1);
		expect(await repo.getByWorkoutAndExercise('Upper Body', 'Squat')).toHaveLength(1);
		expect(await repo.getByWorkoutAndExercise('Full Body', 'Plank')).toHaveLength(1);
	});
});
