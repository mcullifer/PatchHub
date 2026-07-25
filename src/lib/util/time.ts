export const Time = {
	SECOND: 1000,
	MINUTE: 60 * 1000,
	HOUR: 60 * 60 * 1000,
	DAY: 24 * 60 * 60 * 1000
} as const;

export function parseDateForDisplay(value: string): Date {
	const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!dateOnly) return new Date(value);

	return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
}
