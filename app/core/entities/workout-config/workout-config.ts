import type { WeekDay } from '../workout/workout';

type RoutineEntry =
	| { type: 'workout'; workoutName: string; weekDay?: WeekDay }
	| { type: 'rest'; weekDay?: WeekDay };

interface WorkoutConfigTracking {
	lastCreditedDate: string;   // 'YYYY-MM-DD'
	lastCreditedIndex: number;  // sequence index credited on lastCreditedDate; unused in scheduled mode
}

interface WorkoutConfig {
	username: string;
	routineType: 'sequential' | 'scheduled';
	entries: RoutineEntry[];
	tracking: WorkoutConfigTracking | null;
}

export type { WorkoutConfig, WorkoutConfigTracking, RoutineEntry };
