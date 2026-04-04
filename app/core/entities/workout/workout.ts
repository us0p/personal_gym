enum WeekDay {
	MONDAY = 'MONDAY',
	TUESDAY = 'TUESDAY',
	WEDNESDAY = 'WEDNESDAY',
	THURSDAY = 'THURSDAY',
	FRIDAY = 'FRIDAY',
	SATURDAY = 'SATURDAY',
	SUNDAY = 'SUNDAY',
}

interface Workout {
	name: string;
	exercises: string[];
	username: string;
	weekDays?: WeekDay[];
}

export { WeekDay };
export type { Workout };
