const DEFAULT_RETURN_TO = '/';

export function normalizeReturnTo(value: string | null): string {
	if (!value) return DEFAULT_RETURN_TO;
	if (!value.startsWith('/')) return DEFAULT_RETURN_TO;
	if (value.startsWith('//')) return DEFAULT_RETURN_TO;

	return value;
}
