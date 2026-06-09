import { parseBBCodeAst } from './bbcode/BBCodeParser';
import { BBCodeRenderer } from './bbcode/BBCodeRenderer';
import { isKnownSteamTag } from './bbcode/SteamBBCode';
import type { ParseOptions, ParseResult } from './bbcode/types';

export type { BBCodeTag, BBCodeToken, ParseError, ParseOptions, ParseResult } from './bbcode/types';

export class BBCodeParser {
	private readonly options: ParseOptions;

	constructor(options: ParseOptions = {}) {
		this.options = {
			allowUnclosedTags: true,
			strictMode: false,
			escapeHtml: true,
			preserveNewlines: 'double',
			...options
		};
	}

	parse(bbcode: string): ParseResult {
		if (typeof bbcode !== 'string') {
			return {
				html: '',
				errors: [{ message: 'BBCode input must be a string', position: 0, type: 'invalid_tag' }],
				warnings: []
			};
		}

		if (bbcode.length === 0) {
			return {
				html: '',
				errors: [{ message: 'BBCode input is empty', position: 0, type: 'invalid_tag' }],
				warnings: []
			};
		}

		const result = parseBBCodeAst(bbcode, this.options);
		const renderer = new BBCodeRenderer(this.options);

		return {
			html: renderer.render(result.ast),
			errors: result.errors,
			warnings: result.warnings
		};
	}

	parseWithCustomTags(bbcode: string, customTags: ParseOptions['customTags']): ParseResult {
		return new BBCodeParser({ ...this.options, customTags }).parse(bbcode);
	}

	validate(bbcode: string) {
		const result = this.parse(bbcode);
		return {
			isValid: result.errors.length === 0,
			errors: result.errors,
			warnings: result.warnings
		};
	}

	getSupportedTags(): string[] {
		return [
			'b',
			'i',
			'u',
			's',
			'strike',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'quote',
			'p',
			'code',
			'hr',
			'list',
			'olist',
			'*',
			'url',
			'img',
			'previewyoutube',
			'video',
			'table',
			'tr',
			'td',
			'th',
			'expand',
			'color',
			'size',
			'spoiler'
		].filter(isKnownSteamTag);
	}
}

export function parseBBCode(bbcode: string, options?: ParseOptions): string {
	return new BBCodeParser(options).parse(bbcode).html;
}

export function parseBBCodeSafe(
	bbcode: string,
	options?: ParseOptions
): ParseResult & { success: boolean; errorMessages: string[] } {
	const result = new BBCodeParser(options).parse(bbcode);
	return {
		...result,
		success: result.errors.length === 0,
		errorMessages: result.errors.map((error) => error.message)
	};
}
