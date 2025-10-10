/**
 * BBCode Parser - A comprehensive parser for converting BBCode to HTML
 *
 * Features:
 * - Type-safe tokenization and parsing
 * - Support for nested tags
 * - Error handling and validation
 * - Extensible tag system
 * - Clean separation of concerns
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface BBCodeTag {
	name: string;
	attributes: Record<string, string>;
	isClosing: boolean;
	isSelfClosing: boolean;
}

export interface BBCodeToken {
	type: 'text' | 'tag' | 'newline';
	content: string;
	tag?: BBCodeTag;
	position: number;
}

export interface ParseOptions {
	allowUnclosedTags?: boolean;
	strictMode?: boolean;
	customTags?: Record<string, (content: string, attributes: Record<string, string>) => string>;
	escapeHtml?: boolean;
	steamClanImageUrl?: string;
	preserveNewlines?: 'all' | 'double' | 'none';
}

export interface ParseResult {
	html: string;
	errors: ParseError[];
	warnings: string[];
}

export interface ParseError {
	message: string;
	position: number;
	type: 'unclosed_tag' | 'invalid_tag' | 'malformed_attribute' | 'unknown_tag';
}

// ============================================================================
// TAG DEFINITIONS
// ============================================================================

interface TagDefinition {
	htmlTag: string;
	isSelfClosing?: boolean;
	requiresClosing?: boolean;
	allowedAttributes?: string[];
	transform?: (content: string, attributes: Record<string, string>) => string;
}

const TAG_DEFINITIONS: Record<string, TagDefinition> = {
	// Text formatting
	b: { htmlTag: 'strong', requiresClosing: true },
	i: { htmlTag: 'em', requiresClosing: true },
	u: { htmlTag: 'u', requiresClosing: true },
	s: { htmlTag: 's', requiresClosing: true },
	strike: { htmlTag: 's', requiresClosing: true },

	// Headers
	h1: { htmlTag: 'h1', requiresClosing: true },
	h2: { htmlTag: 'h2', requiresClosing: true },
	h3: { htmlTag: 'h3', requiresClosing: true },
	h4: { htmlTag: 'h4', requiresClosing: true },
	h5: { htmlTag: 'h5', requiresClosing: true },
	h6: { htmlTag: 'h6', requiresClosing: true },

	// Lists
	list: {
		htmlTag: 'ul',
		requiresClosing: true
	},
	olist: {
		htmlTag: 'ol',
		requiresClosing: true
	},
	'*': {
		htmlTag: 'li',
		requiresClosing: false,
		isSelfClosing: true
	},

	// Other elements
	p: { htmlTag: 'p', requiresClosing: true },
	quote: { htmlTag: 'blockquote', requiresClosing: true },
	code: { htmlTag: 'code', requiresClosing: true },
	hr: { htmlTag: 'hr', isSelfClosing: true, requiresClosing: false },

	// Tables
	table: { htmlTag: 'table', requiresClosing: true },
	tr: { htmlTag: 'tr', requiresClosing: true },
	td: { htmlTag: 'td', requiresClosing: true },
	th: { htmlTag: 'th', requiresClosing: true },

	// Special tags with custom handling
	url: {
		htmlTag: 'a',
		requiresClosing: true,
		transform: (content: string, attributes: Record<string, string>) => {
			// Handle [url=...]...[/url] or [url]...[/url]
			const href = attributes.url || content;
			const displayText = content || href;
			return `<a href="${href}">${displayText}</a>`;
		}
	},
	img: {
		htmlTag: 'img',
		isSelfClosing: false,
		requiresClosing: true,
		transform: (content: string, attributes: Record<string, string>) => {
			// Handle [img src="..."][/img], [img src=...][/img], or [img]...[/img]
			const src = attributes.src || content.trim();
			const alt = attributes.alt || '';
			// Note: {STEAM_CLAN_IMAGE} replacement will be handled by the main converter
			return `<img src="${src}" alt="${alt}" />`;
		}
	},
	color: {
		htmlTag: 'span',
		requiresClosing: true,
		transform: (content: string, attributes: Record<string, string>) => {
			const color = attributes.color || '#000000';
			return `<span style="color: ${color}">${content}</span>`;
		}
	},
	size: {
		htmlTag: 'span',
		requiresClosing: true,
		transform: (content: string, attributes: Record<string, string>) => {
			const size = attributes.size || '12px';
			return `<span style="font-size: ${size}">${content}</span>`;
		}
	},
	spoiler: {
		htmlTag: 'details',
		requiresClosing: true,
		transform: (content: string) => `<details><summary>Spoiler</summary>${content}</details>`
	},
	video: {
		htmlTag: 'video',
		requiresClosing: true,
		transform: (content: string, attributes: Record<string, string>) => {
			// Check if this is a YouTube video (has video attribute with YouTube ID)
			if (attributes.video && !attributes.webm && !attributes.mp4) {
				const videoId = attributes.video;
				const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
				const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
				return `
				<div>
					<a href="${videoUrl}" target="_blank">
						<img src="${thumbnailUrl}" alt="YouTube Video Thumbnail" style="margin-left: auto;margin-right:auto;" />
					</a>
				</div>`;
			}

			// Handle multi-format video (Steam, etc.)
			const webmSrc = attributes.webm || '';
			const mp4Src = attributes.mp4 || '';
			const posterSrc = attributes.poster || '';
			const autoplay = attributes.autoplay === 'true' ? 'autoplay' : '';
			const controls = attributes.controls === 'false' ? '' : 'controls';
			const loop = attributes.loop === 'true' ? 'loop' : '';
			const muted = attributes.muted === 'true' ? 'muted' : '';

			// Build video sources
			let sources = '';
			if (webmSrc) {
				sources += `<source src="${webmSrc}" type="video/webm">`;
			}
			if (mp4Src) {
				sources += `<source src="${mp4Src}" type="video/mp4">`;
			}

			// Build video attributes
			const videoAttrs = [autoplay, controls, loop, muted].filter((attr) => attr).join(' ');
			const posterAttr = posterSrc ? `poster="${posterSrc}"` : '';

			return `<video ${videoAttrs} ${posterAttr} style="max-width: 100%; height: auto;">
				${sources}
				${content || 'Your browser does not support the video tag.'}
			</video>`;
		}
	},
	previewyoutube: {
		htmlTag: 'div',
		requiresClosing: true,
		transform: (content: string, attributes: Record<string, string>) => {
			// Handle [previewyoutube=videoId;full][/previewyoutube] or [previewyoutube=videoId][/previewyoutube]
			let videoId = attributes.previewyoutube || content;

			// Parse semicolon-separated format (e.g., "videoId;full")
			if (videoId && videoId.includes(';')) {
				videoId = videoId.split(';')[0].trim();
			}

			// Remove quotes if present
			videoId = videoId.replace(/^["']|["']$/g, '');

			const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
			const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
			return `<div>
	<a href="${videoUrl}" target="_blank">
		<img src="${thumbnailUrl}" alt="YouTube Video Thumbnail" style="margin-left: auto;margin-right:auto;" />
	</a>
</div>`;
		}
	}
};

// ============================================================================
// TOKENIZER
// ============================================================================

class BBCodeTokenizer {
	private input: string;
	private position: number = 0;
	private tokens: BBCodeToken[] = [];

	constructor(input: string) {
		this.input = input;
	}

	tokenize(): BBCodeToken[] {
		this.position = 0;
		this.tokens = [];

		while (this.position < this.input.length) {
			const char = this.input[this.position];

			if (char === '\n') {
				this.addToken('newline', '\n', this.position);
				this.position++;
			} else if (char === '[') {
				this.tokenizeTag();
			} else {
				this.tokenizeText();
			}
		}

		return this.tokens;
	}

	private tokenizeText(): void {
		let content = '';
		const startPos = this.position;

		while (
			this.position < this.input.length &&
			this.input[this.position] !== '[' &&
			this.input[this.position] !== '\n'
		) {
			content += this.input[this.position];
			this.position++;
		}

		if (content) {
			// Check if this text contains list item markers and split them
			this.processTextWithListMarkers(content, startPos);
		}
	}

	private processTextWithListMarkers(text: string, startPos: number): void {
		// Split text by [*] markers and create separate tokens
		const parts = text.split(/(\[\*\])/);
		let currentPos = startPos;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part === '[*]') {
				// Create a special list item token
				this.addToken('tag', part, currentPos, {
					name: '*',
					attributes: {},
					isClosing: false,
					isSelfClosing: false
				});
			} else if (part) {
				// Regular text content
				this.addToken('text', part, currentPos);
			}
			currentPos += part.length;
		}
	}

	private tokenizeTag(): void {
		const startPos = this.position;
		let content = '';
		this.position++; // Skip opening '['

		while (this.position < this.input.length && this.input[this.position] !== ']') {
			content += this.input[this.position];
			this.position++;
		}

		if (this.position < this.input.length) {
			this.position++; // Skip closing ']'
			const tag = this.parseTag(content);
			this.addToken('tag', content, startPos, tag);
		} else {
			// Unclosed tag, treat as text
			this.addToken('text', '[' + content, startPos);
		}
	}

	private parseTag(content: string): BBCodeTag {
		const isClosing = content.startsWith('/');
		const tagName = isClosing ? content.substring(1) : content;

		// Check for self-closing tags
		const isSelfClosing = content.endsWith('/');
		const actualTagName = isSelfClosing ? tagName.substring(0, tagName.length - 1) : tagName;

		// Parse attributes
		const attributes: Record<string, string> = {};

		// Split by spaces, but respect quoted strings
		const parts: string[] = [];
		let current = '';
		let inQuotes = false;
		let quoteChar = '';

		for (let i = 0; i < actualTagName.length; i++) {
			const char = actualTagName[i];

			if ((char === '"' || char === "'") && (i === 0 || actualTagName[i - 1] !== '\\')) {
				if (!inQuotes) {
					inQuotes = true;
					quoteChar = char;
					current += char;
				} else if (char === quoteChar) {
					inQuotes = false;
					quoteChar = '';
					current += char;
				} else {
					current += char;
				}
			} else if (char === ' ' && !inQuotes) {
				if (current) {
					parts.push(current);
					current = '';
				}
			} else {
				current += char;
			}
		}

		if (current) {
			parts.push(current);
		}

		// First part is always the tag name
		if (parts.length === 0) {
			return {
				name: actualTagName,
				attributes,
				isClosing,
				isSelfClosing
			};
		}

		const tagNamePart = parts[0];
		const equalIndex = tagNamePart.indexOf('=');

		if (equalIndex !== -1) {
			// Tag has format like [tag=value] or [tag=value attr1=val1]
			const tagNameOnly = tagNamePart.substring(0, equalIndex).trim();
			let attributeValue = tagNamePart.substring(equalIndex + 1).trim();

			// Remove quotes
			if (
				(attributeValue.startsWith('"') && attributeValue.endsWith('"')) ||
				(attributeValue.startsWith("'") && attributeValue.endsWith("'"))
			) {
				attributeValue = attributeValue.slice(1, -1);
			}

			// Store the primary attribute with tag name as key
			attributes[tagNameOnly] = attributeValue;

			// Parse remaining parts as additional attributes
			for (let i = 1; i < parts.length; i++) {
				const part = parts[i];
				const partEqualIndex = part.indexOf('=');
				if (partEqualIndex !== -1) {
					const name = part.substring(0, partEqualIndex).trim();
					let value = part.substring(partEqualIndex + 1).trim();
					if (
						(value.startsWith('"') && value.endsWith('"')) ||
						(value.startsWith("'") && value.endsWith("'"))
					) {
						value = value.slice(1, -1);
					}
					attributes[name] = value;
				}
			}

			return {
				name: tagNameOnly,
				attributes,
				isClosing,
				isSelfClosing
			};
		}

		// No equals sign in first part, so parse all parts for attributes
		const tagNameOnly = parts[0];

		for (let i = 1; i < parts.length; i++) {
			const part = parts[i];
			const partEqualIndex = part.indexOf('=');
			if (partEqualIndex !== -1) {
				const name = part.substring(0, partEqualIndex).trim();
				let value = part.substring(partEqualIndex + 1).trim();
				if (
					(value.startsWith('"') && value.endsWith('"')) ||
					(value.startsWith("'") && value.endsWith("'"))
				) {
					value = value.slice(1, -1);
				}
				attributes[name] = value;
			}
		}

		return {
			name: tagNameOnly,
			attributes,
			isClosing,
			isSelfClosing
		};
	}

	private addToken(
		type: BBCodeToken['type'],
		content: string,
		position: number,
		tag?: BBCodeTag
	): void {
		this.tokens.push({
			type,
			content,
			tag,
			position
		});
	}
}

// ============================================================================
// HTML CONVERTER
// ============================================================================

class HTMLConverter {
	private tokens: BBCodeToken[];
	private options: ParseOptions;
	private errors: ParseError[] = [];
	private warnings: string[] = [];
	private tagStack: BBCodeTag[] = [];

	constructor(tokens: BBCodeToken[], options: ParseOptions = {}) {
		this.tokens = tokens;
		this.options = {
			allowUnclosedTags: false,
			strictMode: true,
			customTags: {},
			escapeHtml: true,
			preserveNewlines: 'double',
			...options
		};
	}

	convert(): ParseResult {
		this.errors = [];
		this.warnings = [];
		this.tagStack = [];

		let html = '';
		let i = 0;
		let consecutiveNewlines = 0;

		while (i < this.tokens.length) {
			const token = this.tokens[i];

			switch (token.type) {
				case 'text':
					html += this.options.escapeHtml ? this.escapeHtml(token.content) : token.content;
					consecutiveNewlines = 0;
					break;
				case 'newline':
					consecutiveNewlines++;
					html += this.handleNewline(consecutiveNewlines);
					break;
				case 'tag':
					if (token.tag) {
						const result = this.processTag(token.tag, i);
						html += result.html;
						consecutiveNewlines = 0;
						if (result.consumedTokens > 0) {
							i += result.consumedTokens; // Skip consumed tokens
							continue; // Skip the i++ at the end
						}
					}
					break;
			}
			i++;
		}

		// List items are now handled during main parsing

		// Check for unclosed tags
		if (this.tagStack.length > 0 && !this.options.allowUnclosedTags) {
			for (const unclosedTag of this.tagStack) {
				this.errors.push({
					message: `Unclosed tag: [${unclosedTag.name}]`,
					position: -1,
					type: 'unclosed_tag'
				});
			}
		}

		// Replace {STEAM_CLAN_IMAGE} placeholder if steamClanImageUrl is provided
		if (this.options.steamClanImageUrl) {
			html = html.replace(/{STEAM_CLAN_IMAGE}/g, this.options.steamClanImageUrl);
		}

		return {
			html,
			errors: this.errors,
			warnings: this.warnings
		};
	}

	private handleNewline(consecutiveCount: number): string {
		switch (this.options.preserveNewlines) {
			case 'all':
				// Preserve all newlines as <br> tags
				return '<br>';
			case 'double':
				// First newline: space (for line wrapping within paragraph)
				// Second newline: <br> (for paragraph break)
				// Additional newlines: ignored
				if (consecutiveCount === 1) return ' ';
				if (consecutiveCount === 2) return '<br>';
				return '';
			case 'none':
				// Convert first newline to space, ignore subsequent consecutive newlines
				return consecutiveCount === 1 ? ' ' : '';
			default:
				return consecutiveCount === 1 ? ' ' : '';
		}
	}

	private processTag(tag: BBCodeTag, tokenIndex: number): { html: string; consumedTokens: number } {
		// Special handling for list items
		if (tag.name === '*' && !tag.isClosing) {
			return this.processListItem(tag, tokenIndex);
		}

		if (tag.isClosing) {
			return this.processClosingTag(tag);
		} else if (tag.isSelfClosing) {
			return this.processSelfClosingTag(tag);
		} else {
			return this.processOpeningTag(tag, tokenIndex);
		}
	}

	private processOpeningTag(
		tag: BBCodeTag,
		tokenIndex: number
	): { html: string; consumedTokens: number } {
		const definition = TAG_DEFINITIONS[tag.name];

		if (!definition) {
			if (this.options.strictMode) {
				this.errors.push({
					message: `Unknown tag: [${tag.name}]`,
					position: this.tokens[tokenIndex].position,
					type: 'unknown_tag'
				});
				return { html: '', consumedTokens: 0 };
			} else {
				this.warnings.push(`Unknown tag: [${tag.name}]`);
				return { html: `[${tag.name}]`, consumedTokens: 0 };
			}
		}

		if (definition.isSelfClosing) {
			return this.processSelfClosingTag(tag);
		}

		// Special handling for list items
		if (tag.name === '*') {
			return this.processListItem(tag, tokenIndex);
		}

		// Find content and closing tag
		const content = this.findTagContent(tokenIndex + 1, tag.name);

		if (content.found) {
			const htmlContent = this.convertTokensToHtml(content.tokens);
			const html = this.buildTagHtml(tag, htmlContent, definition);
			return { html, consumedTokens: content.consumedTokens + 1 };
		} else {
			// No closing tag found
			if (this.options.allowUnclosedTags) {
				this.warnings.push(`Unclosed tag: [${tag.name}]`);
				return { html: `[${tag.name}]`, consumedTokens: 0 };
			} else {
				this.errors.push({
					message: `Unclosed tag: [${tag.name}]`,
					position: this.tokens[tokenIndex].position,
					type: 'unclosed_tag'
				});
				return { html: '', consumedTokens: 0 };
			}
		}
	}

	private processListItem(
		tag: BBCodeTag,
		tokenIndex: number
	): { html: string; consumedTokens: number } {
		// For list items, collect content until the next [*] or [/list] or end of tokens
		const content: BBCodeToken[] = [];
		let i = tokenIndex + 1;

		while (i < this.tokens.length) {
			const token = this.tokens[i];

			// Stop at next [*] or [/list] or other closing tags
			if (token.type === 'tag' && token.tag) {
				if (
					token.tag.name === '*' ||
					(token.tag.isClosing && (token.tag.name === 'list' || token.tag.name === 'olist'))
				) {
					break;
				}
			}

			content.push(token);
			i++;
		}

		// Convert content to HTML using the standard converter
		const htmlContent = this.convertTokensToHtml(content);

		// Create the list item HTML directly
		const html = `<li>${htmlContent}</li>`;

		// Return the number of tokens consumed: content tokens + 1 for the [*] tag itself
		// This ensures we skip past all content tokens to the next [*] or closing tag
		return { html, consumedTokens: content.length + 1 };
	}

	private processClosingTag(tag: BBCodeTag): { html: string; consumedTokens: number } {
		const stackIndex = this.tagStack.findIndex((t) => t.name === tag.name);

		if (stackIndex === -1) {
			this.errors.push({
				message: `Closing tag without opening: [/${tag.name}]`,
				position: -1,
				type: 'invalid_tag'
			});
			return { html: '', consumedTokens: 0 };
		}

		// Remove from stack
		this.tagStack.splice(stackIndex, 1);
		return { html: '', consumedTokens: 0 };
	}

	private processSelfClosingTag(tag: BBCodeTag): { html: string; consumedTokens: number } {
		const definition = TAG_DEFINITIONS[tag.name];

		if (!definition) {
			if (this.options.strictMode) {
				this.errors.push({
					message: `Unknown self-closing tag: [${tag.name}]`,
					position: -1,
					type: 'unknown_tag'
				});
				return { html: '', consumedTokens: 0 };
			} else {
				return { html: `[${tag.name}]`, consumedTokens: 0 };
			}
		}

		// For truly self-closing tags like <hr>, use self-closing format
		if (definition.isSelfClosing) {
			return { html: `<${definition.htmlTag} />`, consumedTokens: 0 };
		}

		const html = this.buildTagHtml(tag, '', definition);
		return { html, consumedTokens: 0 };
	}

	private findTagContent(
		startIndex: number,
		tagName: string
	): { found: boolean; tokens: BBCodeToken[]; consumedTokens: number } {
		const content: BBCodeToken[] = [];
		let depth = 1;
		let i = startIndex;

		while (i < this.tokens.length && depth > 0) {
			const token = this.tokens[i];

			if (token.type === 'tag' && token.tag) {
				if (token.tag.name === tagName) {
					if (token.tag.isClosing) {
						depth--;
						if (depth === 0) {
							return { found: true, tokens: content, consumedTokens: i - startIndex + 1 };
						}
					} else if (!token.tag.isSelfClosing) {
						depth++;
					}
				}
			}

			if (depth > 0) {
				content.push(token);
			}
			i++;
		}

		return { found: false, tokens: content, consumedTokens: i - startIndex };
	}

	private convertTokensToHtml(tokens: BBCodeToken[]): string {
		const converter = new HTMLConverter(tokens, this.options);
		const result = converter.convert();
		this.errors.push(...result.errors);
		this.warnings.push(...result.warnings);
		return result.html;
	}

	private convertTokensToHtmlWithoutEscaping(tokens: BBCodeToken[]): string {
		// Create a custom converter that doesn't escape HTML
		const converter = new HTMLConverter(tokens, { ...this.options, escapeHtml: false });
		const result = converter.convert();
		this.errors.push(...result.errors);
		this.warnings.push(...result.warnings);
		return result.html;
	}

	private buildTagHtml(tag: BBCodeTag, content: string, definition: TagDefinition): string {
		if (definition.transform) {
			return definition.transform(content, tag.attributes);
		}

		const attributes = this.buildAttributes(tag.attributes);

		// Content from convertTokensToHtml is already processed, don't escape it
		// It already contains properly converted HTML from nested tags
		return `<${definition.htmlTag}${attributes}>${content}</${definition.htmlTag}>`;
	}

	private buildAttributes(attributes: Record<string, string>): string {
		const attrStrings = Object.entries(attributes).map(([key, value]) => {
			if (key === 'href' || key === 'src') {
				return `${key}="${this.escapeHtml(value)}"`;
			}
			return `${key}="${this.escapeHtml(value)}"`;
		});

		return attrStrings.length > 0 ? ' ' + attrStrings.join(' ') : '';
	}

	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
}

// ============================================================================
// MAIN PARSER CLASS
// ============================================================================

export class BBCodeParser {
	private options: ParseOptions;

	constructor(options: ParseOptions = {}) {
		this.options = {
			allowUnclosedTags: false,
			strictMode: true,
			customTags: {},
			...options
		};
	}

	/**
	 * Parse BBCode string to HTML
	 */
	parse(bbcode: string): ParseResult {
		if (!bbcode || typeof bbcode !== 'string') {
			return {
				html: '',
				errors: [
					{
						message: 'Invalid input: expected non-empty string',
						position: 0,
						type: 'invalid_tag'
					}
				],
				warnings: []
			};
		}

		// Tokenize the input
		const tokenizer = new BBCodeTokenizer(bbcode);
		const tokens = tokenizer.tokenize();

		// Convert tokens to HTML
		const converter = new HTMLConverter(tokens, this.options);
		return converter.convert();
	}

	/**
	 * Parse BBCode with custom tag handlers
	 */
	parseWithCustomTags(
		bbcode: string,
		customTags: Record<string, (content: string, attributes: Record<string, string>) => string>
	): ParseResult {
		const options = { ...this.options, customTags };
		const parser = new BBCodeParser(options);
		return parser.parse(bbcode);
	}

	/**
	 * Validate BBCode without converting to HTML
	 */
	validate(bbcode: string): { isValid: boolean; errors: ParseError[]; warnings: string[] } {
		const result = this.parse(bbcode);
		return {
			isValid: result.errors.length === 0,
			errors: result.errors,
			warnings: result.warnings
		};
	}

	/**
	 * Get supported tags
	 */
	getSupportedTags(): string[] {
		return Object.keys(TAG_DEFINITIONS);
	}

	/**
	 * Add custom tag definition
	 */
	addTagDefinition(name: string, definition: TagDefinition): void {
		TAG_DEFINITIONS[name] = definition;
	}
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick parse function for simple use cases
 */
export function parseBBCode(bbcode: string, options?: ParseOptions): string {
	const parser = new BBCodeParser(options);
	const result = parser.parse(bbcode);
	return result.html;
}

/**
 * Parse BBCode with error handling
 */
export function parseBBCodeSafe(
	bbcode: string,
	options?: ParseOptions
): { html: string; success: boolean; errors: string[] } {
	const parser = new BBCodeParser(options);
	const result = parser.parse(bbcode);

	return {
		html: result.html,
		success: result.errors.length === 0,
		errors: result.errors.map((e) => e.message)
	};
}
