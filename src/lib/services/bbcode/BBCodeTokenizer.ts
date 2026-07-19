import type { BBCodeTag, BBCodeToken } from './types';

const tagNamePattern = /^\/?\*|^\/?[a-z][a-z0-9_-]*/i;

export class BBCodeTokenizer {
	private readonly input: string;

	constructor(input: string) {
		this.input = input.replace(/\r\n?/g, '\n');
	}

	tokenize(): BBCodeToken[] {
		const tokens: BBCodeToken[] = [];
		let textStart = 0;
		let position = 0;

		while (position < this.input.length) {
			if (this.input[position] !== '[') {
				position += 1;
				continue;
			}

			if (isEscapedOpeningBracket(this.input, position)) {
				position += 1;
				continue;
			}

			const tagEnd = this.input.indexOf(']', position + 1);
			if (tagEnd === -1) {
				break;
			}

			const rawContent = this.input.slice(position + 1, tagEnd);
			const tag = parseTag(rawContent, this.input.slice(position, tagEnd + 1));
			if (!tag) {
				position = tagEnd + 1;
				continue;
			}

			if (textStart < position) {
				tokens.push({
					type: 'text',
					content: this.input.slice(textStart, position),
					position: textStart
				});
			}

			tokens.push({
				type: 'tag',
				content: rawContent,
				tag,
				position
			});

			position = tagEnd + 1;
			textStart = position;
		}

		if (textStart < this.input.length) {
			tokens.push({
				type: 'text',
				content: this.input.slice(textStart),
				position: textStart
			});
		}

		return tokens;
	}
}

function isEscapedOpeningBracket(input: string, position: number): boolean {
	let backslashCount = 0;
	let index = position - 1;

	while (index >= 0 && input[index] === '\\') {
		backslashCount += 1;
		index -= 1;
	}

	return backslashCount % 2 === 1;
}

function parseTag(content: string, raw: string): BBCodeTag | null {
	const trimmed = content.trim();
	if (!trimmed) return null;

	const match = trimmed.match(tagNamePattern);
	if (!match) return null;

	const tagName = match[0];
	const isClosing = tagName.startsWith('/');
	const name = (isClosing ? tagName.slice(1) : tagName).toLowerCase();
	const rest = trimmed.slice(match[0].length).trim();
	const attributes: Record<string, string> = {};
	let value: string | undefined;
	const isSelfClosing = rest === '/' || /\s\/$/.test(rest);

	if (isClosing && rest.length > 0) {
		return null;
	}

	if (!isClosing) {
		const cleanedRest = isSelfClosing ? rest.replace(/\s*\/$/, '').trim() : rest;
		if (cleanedRest.startsWith('=')) {
			value = unquote(cleanedRest.slice(1).trim());
			attributes[name] = value;
		} else if (cleanedRest.length > 0) {
			const parsedAttributes = parseAttributes(cleanedRest);
			if (!parsedAttributes) {
				return null;
			}

			for (const attr of parsedAttributes) {
				attributes[attr.name] = attr.value;
			}
		}
	}

	return {
		name,
		attributes,
		value,
		isClosing,
		isSelfClosing,
		raw
	};
}

function parseAttributes(input: string): { name: string; value: string }[] | null {
	const attributes: { name: string; value: string }[] = [];
	const pattern = /([a-z][a-z0-9_-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s]+)/iy;
	let position = 0;

	while (position < input.length) {
		while (/\s/.test(input[position] ?? '')) {
			position += 1;
		}

		pattern.lastIndex = position;
		const match = pattern.exec(input);
		if (!match) return null;

		attributes.push({
			name: match[1].toLowerCase(),
			value: unquote(match[2])
		});
		position = pattern.lastIndex;
	}

	return attributes;
}

function unquote(value: string): string {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}

	return trimmed;
}
