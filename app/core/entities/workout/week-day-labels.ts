import { WeekDay } from './workout';

/** { value, label } pairs for rendering weekday checkboxes in forms. */
const WEEK_DAYS: { value: WeekDay; label: string }[] = [
	{ value: WeekDay.MONDAY, label: 'Mon' },
	{ value: WeekDay.TUESDAY, label: 'Tue' },
	{ value: WeekDay.WEDNESDAY, label: 'Wed' },
	{ value: WeekDay.THURSDAY, label: 'Thu' },
	{ value: WeekDay.FRIDAY, label: 'Fri' },
	{ value: WeekDay.SATURDAY, label: 'Sat' },
	{ value: WeekDay.SUNDAY, label: 'Sun' },
];

/** Abbreviated day names (Mon, Tue …) for compact badges. */
const DAY_LABEL_SHORT: Record<WeekDay, string> = {
	[WeekDay.MONDAY]: 'Mon',
	[WeekDay.TUESDAY]: 'Tue',
	[WeekDay.WEDNESDAY]: 'Wed',
	[WeekDay.THURSDAY]: 'Thu',
	[WeekDay.FRIDAY]: 'Fri',
	[WeekDay.SATURDAY]: 'Sat',
	[WeekDay.SUNDAY]: 'Sun',
};

/** Full day names (Monday, Tuesday …) for detail views. */
const DAY_LABEL_LONG: Record<WeekDay, string> = {
	[WeekDay.MONDAY]: 'Monday',
	[WeekDay.TUESDAY]: 'Tuesday',
	[WeekDay.WEDNESDAY]: 'Wednesday',
	[WeekDay.THURSDAY]: 'Thursday',
	[WeekDay.FRIDAY]: 'Friday',
	[WeekDay.SATURDAY]: 'Saturday',
	[WeekDay.SUNDAY]: 'Sunday',
};

export { WEEK_DAYS, DAY_LABEL_SHORT, DAY_LABEL_LONG };
