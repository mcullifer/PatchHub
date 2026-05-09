export const steamInlineTags = new Set(['b', 'i', 'u', 's', 'strike', 'color', 'size', 'spoiler']);
export const steamBlockTags = new Set([
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'quote',
	'p',
	'code',
	'list',
	'olist',
	'table',
	'tr',
	'td',
	'th',
	'url',
	'img',
	'previewyoutube',
	'video'
]);
export const steamSelfClosingTags = new Set(['hr']);
export const steamListItemTag = '*';

export function isKnownSteamTag(name: string): boolean {
	return (
		name === steamListItemTag ||
		steamInlineTags.has(name) ||
		steamBlockTags.has(name) ||
		steamSelfClosingTags.has(name)
	);
}

export function isStructuralSteamTag(name: string): boolean {
	return ['list', 'olist', 'table', 'tr'].includes(name);
}
