export function normalizeName(name: string): string {
	return name
		.normalize('NFD') // Normalize Unicode characters
		.replace(/[^a-zA-Z0-9 ]/g, '') // Remove special symbols
		.replace(/\s+/g, '_') // Replace spaces with underscores
		.toUpperCase();
}
