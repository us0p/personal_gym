/** Returns a yyyy-mm-dd string suitable for <input type="date" />, or '' for null/undefined. */
export function toDateInputValue(date: Date | null | undefined): string {
	if (!date) return '';
	return new Date(date).toISOString().split('T')[0];
}

/** Returns the current age in full years, or undefined for null/undefined birth dates. */
export function calculateAge(birthDate: Date | null | undefined): number | undefined {
	if (!birthDate) return undefined;
	const today = new Date();
	const birth = new Date(birthDate);
	let age = today.getFullYear() - birth.getFullYear();
	const monthDiff = today.getMonth() - birth.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
		age--;
	}
	return age;
}
