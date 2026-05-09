export function normalizeName(name: string): string {
	return name
		.normalize('NFD') // Normalize Unicode characters
		.replace(/[^a-zA-Z0-9 ]/g, '') // Remove special symbols
		.replace(/\s+/g, '_') // Replace spaces with underscores
		.toUpperCase();
}

export function normalizeSearchName(name: string): string {
	return name
		.replace(/[™®©℠]/g, ' ')
		.normalize('NFKC')
		.replace(/[\p{Control}\p{Punctuation}\p{Symbol}]+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLocaleLowerCase();
}

export function getSearchTokens(query: string): string[] {
	const tokens = normalizeSearchName(query)
		.split(' ')
		.map((token) => token.trim())
		.filter((token) => token.length > 0);

	return [...new Set(tokens)];
}

export function createSlug(name: string, fallback: string): string {
	const slug = name
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.toLocaleLowerCase()
		.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);

	return slug || fallback;
}
