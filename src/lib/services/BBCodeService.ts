import { BBCodeParser } from './BBCodeParser';

export class BBCodeService {
	static readonly steamClanImgUrl = 'https://clan.akamai.steamstatic.com/images/';

	/**
	 * Convert BBCode to HTML using the comprehensive BBCodeParser
	 * @param bbcode - The BBCode string to parse
	 * @param preserveNewlines - How to handle newlines: 'all' (keep as <br>), 'double' (only double newlines), 'none' (convert to spaces)
	 */
	static bbcodeToHtml(
		bbcode: string,
		preserveNewlines: 'all' | 'double' | 'none' = 'none'
	): string {
		const parser = new BBCodeParser({
			strictMode: false,
			allowUnclosedTags: true,
			escapeHtml: true,
			steamClanImageUrl: this.steamClanImgUrl,
			preserveNewlines
		});

		const result = parser.parse(bbcode);

		// Log warnings in development
		if (result.warnings.length > 0 && typeof console !== 'undefined') {
			console.warn('BBCode parsing warnings:', result.warnings);
		}

		return result.html;
	}
}
