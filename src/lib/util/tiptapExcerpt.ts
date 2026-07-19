const DEFAULT_EXCERPT_LENGTH = 160;

/**
 * Build a plain-text excerpt from serialized TipTap JSON content.
 *
 * Walks the document's text nodes in reading order and returns the first
 * ~160 characters, appending an ellipsis when the content is truncated.
 * Returns an empty string when the content cannot be parsed.
 */
export function tiptapExcerpt(content: string, maxLength = DEFAULT_EXCERPT_LENGTH): string {
	let doc: unknown;
	try {
		doc = JSON.parse(content);
	} catch {
		return '';
	}

	const text = collectText(doc).replace(/\s+/g, ' ').trim();
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength).trimEnd()}…`;
}

// Traverses untrusted JSON defensively: stored content is only loosely validated server-side.
function collectText(node: unknown): string {
	if (typeof node !== 'object' || node === null) return '';
	const { text, content } = node as { text?: unknown; content?: unknown };
	if (typeof text === 'string') return text;
	if (!Array.isArray(content)) return '';
	return content.map(collectText).join(' ');
}
