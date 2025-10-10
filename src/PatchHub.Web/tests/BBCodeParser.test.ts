import { BBCodeParser, parseBBCode, parseBBCodeSafe } from '$lib/services/BBCodeParser';
import { describe, expect, it } from 'vitest';

describe('BBCodeParser - Basic Text Formatting', () => {
	const parser = new BBCodeParser();

	it('should parse bold text', () => {
		const result = parser.parse('[b]bold text[/b]');
		expect(result.html).toBe('<strong>bold text</strong>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse italic text', () => {
		const result = parser.parse('[i]italic text[/i]');
		expect(result.html).toBe('<em>italic text</em>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse underlined text', () => {
		const result = parser.parse('[u]underlined text[/u]');
		expect(result.html).toBe('<u>underlined text</u>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse strikethrough text', () => {
		const result = parser.parse('[s]strikethrough[/s]');
		expect(result.html).toBe('<s>strikethrough</s>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse nested formatting tags', () => {
		const result = parser.parse('[b][i]bold italic[/i][/b]');
		expect(result.html).toBe('<strong><em>bold italic</em></strong>');
		expect(result.errors).toHaveLength(0);
	});

	it('should escape HTML in text content', () => {
		const result = parser.parse('[b]<script>alert("xss")</script>[/b]');
		expect(result.html).toBe(
			'<strong>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</strong>'
		);
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Headers', () => {
	const parser = new BBCodeParser();

	it('should parse h1 header', () => {
		const result = parser.parse('[h1]Header 1[/h1]');
		expect(result.html).toBe('<h1>Header 1</h1>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse h2 header', () => {
		const result = parser.parse('[h2]Header 2[/h2]');
		expect(result.html).toBe('<h2>Header 2</h2>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse h3 header', () => {
		const result = parser.parse('[h3]Header 3[/h3]');
		expect(result.html).toBe('<h3>Header 3</h3>');
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Lists', () => {
	const parser = new BBCodeParser();

	it('should parse unordered list', () => {
		const result = parser.parse('[list][*]Item 1[*]Item 2[*]Item 3[/list]');
		expect(result.html).toBe('<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse ordered list', () => {
		const result = parser.parse('[olist][*]First[*]Second[*]Third[/olist]');
		expect(result.html).toBe('<ol><li>First</li><li>Second</li><li>Third</li></ol>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse list with formatted items', () => {
		const result = parser.parse('[list][*][b]Bold item[/b][*][i]Italic item[/i][/list]');
		expect(result.html).toBe(
			'<ul><li><strong>Bold item</strong></li><li><em>Italic item</em></li></ul>'
		);
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - URLs and Links', () => {
	const parser = new BBCodeParser();

	it('should parse URL with explicit href', () => {
		const result = parser.parse('[url=https://example.com]Click here[/url]');
		expect(result.html).toBe('<a href="https://example.com">Click here</a>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse URL without explicit display text', () => {
		const result = parser.parse('[url]https://example.com[/url]');
		expect(result.html).toBe('<a href="https://example.com">https://example.com</a>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse URL with special characters', () => {
		const result = parser.parse('[url=https://example.com?param=value&other=123]Link[/url]');
		expect(result.html).toContain('href="https://example.com?param=value');
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Images', () => {
	const parser = new BBCodeParser();

	it('should parse image with src attribute', () => {
		const result = parser.parse('[img src="https://example.com/image.jpg"][/img]');
		expect(result.html).toBe('<img src="https://example.com/image.jpg" alt="" />');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse image with content as src', () => {
		const result = parser.parse('[img]https://example.com/image.jpg[/img]');
		expect(result.html).toBe('<img src="https://example.com/image.jpg" alt="" />');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse image with alt text', () => {
		const result = parser.parse('[img src="image.jpg" alt="Description"][/img]');
		expect(result.html).toContain('alt="Description"');
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Steam Clan Images', () => {
	it('should replace {STEAM_CLAN_IMAGE} placeholder', () => {
		const parser = new BBCodeParser({
			steamClanImageUrl: 'https://clan.akamai.steamstatic.com/images/'
		});
		const result = parser.parse('[img]{STEAM_CLAN_IMAGE}/12345/abc.jpg[/img]');
		expect(result.html).toContain('https://clan.akamai.steamstatic.com/images/');
		expect(result.html).not.toContain('{STEAM_CLAN_IMAGE}');
		expect(result.errors).toHaveLength(0);
	});

	it('should handle multiple Steam clan images', () => {
		const parser = new BBCodeParser({
			steamClanImageUrl: 'https://clan.akamai.steamstatic.com/images/'
		});
		const bbcode = '[img]{STEAM_CLAN_IMAGE}/1.jpg[/img][img]{STEAM_CLAN_IMAGE}/2.jpg[/img]';
		const result = parser.parse(bbcode);
		expect(result.html).toContain('https://clan.akamai.steamstatic.com/images/');
		expect(result.html.match(/https:\/\/clan\.akamai\.steamstatic\.com\/images\//g)).toHaveLength(
			2
		);
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - YouTube Videos', () => {
	const parser = new BBCodeParser();

	it('should parse previewyoutube with simple video ID', () => {
		const result = parser.parse('[previewyoutube=dQw4w9WgXcQ][/previewyoutube]');
		expect(result.html).toContain('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
		expect(result.html).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(result.html).toContain('YouTube Video Thumbnail');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse previewyoutube with semicolon-separated format', () => {
		const result = parser.parse('[previewyoutube=dQw4w9WgXcQ;full][/previewyoutube]');
		expect(result.html).toContain('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
		expect(result.html).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse previewyoutube with quoted video ID', () => {
		const result = parser.parse('[previewyoutube="dQw4w9WgXcQ"][/previewyoutube]');
		expect(result.html).toContain('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
		expect(result.errors).toHaveLength(0);
	});

	it('should handle video tag with YouTube ID', () => {
		const result = parser.parse('[video=dQw4w9WgXcQ][/video]');
		expect(result.html).toContain('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
		expect(result.html).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Video Tags', () => {
	const parser = new BBCodeParser();

	it('should parse video with webm and mp4 sources', () => {
		const result = parser.parse('[video webm="video.webm" mp4="video.mp4"][/video]');
		expect(result.html).toContain('<video');
		expect(result.html).toContain('source src="video.webm" type="video/webm"');
		expect(result.html).toContain('source src="video.mp4" type="video/mp4"');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse video with poster image', () => {
		const result = parser.parse('[video webm="video.webm" poster="poster.jpg"][/video]');
		expect(result.html).toContain('poster="poster.jpg"');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse video with autoplay and loop', () => {
		const result = parser.parse('[video webm="video.webm" autoplay="true" loop="true"][/video]');
		expect(result.html).toContain('autoplay');
		expect(result.html).toContain('loop');
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Color and Size', () => {
	const parser = new BBCodeParser();

	it('should parse color tag with hex color', () => {
		const result = parser.parse('[color=#FF0000]red text[/color]');
		expect(result.html).toBe('<span style="color: #FF0000">red text</span>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse color tag with named color', () => {
		const result = parser.parse('[color=blue]blue text[/color]');
		expect(result.html).toBe('<span style="color: blue">blue text</span>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse size tag', () => {
		const result = parser.parse('[size=20px]large text[/size]');
		expect(result.html).toBe('<span style="font-size: 20px">large text</span>');
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Quotes and Code', () => {
	const parser = new BBCodeParser();

	it('should parse quote block', () => {
		const result = parser.parse('[quote]This is a quote[/quote]');
		expect(result.html).toBe('<blockquote>This is a quote</blockquote>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse code block', () => {
		const result = parser.parse('[code]const x = 5;[/code]');
		expect(result.html).toBe('<code>const x = 5;</code>');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse spoiler tag', () => {
		const result = parser.parse('[spoiler]Hidden content[/spoiler]');
		expect(result.html).toContain('<details>');
		expect(result.html).toContain('<summary>Spoiler</summary>');
		expect(result.html).toContain('Hidden content');
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Tables', () => {
	const parser = new BBCodeParser();

	it('should parse simple table', () => {
		const bbcode = '[table][tr][th]Header[/th][/tr][tr][td]Cell[/td][/tr][/table]';
		const result = parser.parse(bbcode);
		expect(result.html).toContain('<table>');
		expect(result.html).toContain('<tr>');
		expect(result.html).toContain('<th>Header</th>');
		expect(result.html).toContain('<td>Cell</td>');
		expect(result.html).toContain('</table>');
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Self-Closing Tags', () => {
	const parser = new BBCodeParser();

	it('should parse horizontal rule', () => {
		const result = parser.parse('[hr]');
		expect(result.html).toBe('<hr />');
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Error Handling', () => {
	it('should handle unclosed tags in strict mode', () => {
		const parser = new BBCodeParser({ strictMode: true, allowUnclosedTags: false });
		const result = parser.parse('[b]unclosed bold');
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].type).toBe('unclosed_tag');
	});

	it('should handle unclosed tags when allowed', () => {
		const parser = new BBCodeParser({ allowUnclosedTags: true });
		const result = parser.parse('[b]unclosed bold');
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	it('should handle unknown tags in strict mode', () => {
		const parser = new BBCodeParser({ strictMode: true });
		const result = parser.parse('[unknown]text[/unknown]');
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].type).toBe('unknown_tag');
	});

	it('should handle unknown tags in non-strict mode', () => {
		const parser = new BBCodeParser({ strictMode: false });
		const result = parser.parse('[unknown]text[/unknown]');
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	it('should handle empty input', () => {
		const parser = new BBCodeParser();
		const result = parser.parse('');
		expect(result.html).toBe('');
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('should handle invalid input type', () => {
		const parser = new BBCodeParser();
		const result = parser.parse(null as any);
		expect(result.errors.length).toBeGreaterThan(0);
	});
});

describe('BBCodeParser - Complex Content', () => {
	const parser = new BBCodeParser();

	it('should parse mixed content', () => {
		const bbcode = `
[h1]Title[/h1]
[p]This is a paragraph with [b]bold[/b] and [i]italic[/i] text.[/p]
[list]
[*]Item 1
[*]Item 2
[/list]
[url=https://example.com]Visit our site[/url]
		`.trim();

		const result = parser.parse(bbcode);
		expect(result.html).toContain('<h1>Title</h1>');
		expect(result.html).toContain('<strong>bold</strong>');
		expect(result.html).toContain('<em>italic</em>');
		expect(result.html).toContain('<ul>');
		expect(result.html).toContain('<li>Item 1');
		expect(result.html).toContain('<li>Item 2');
		expect(result.html).toContain('<a href="https://example.com">Visit our site</a>');
		expect(result.errors).toHaveLength(0);
	});

	it('should handle newlines with default (double) mode', () => {
		const bbcode = 'Line 1\nLine 2\n\nLine 3';
		const result = parser.parse(bbcode);
		// Single newlines add spaces, double newlines become <br>
		// Result: "Line 1 Line 2 <br>Line 3" (space before <br> from first newline of pair)
		expect(result.html).toBe('Line 1 Line 2 <br>Line 3');
		expect(result.errors).toHaveLength(0);
	});

	it('should handle newlines with "all" mode', () => {
		const parser = new BBCodeParser({ preserveNewlines: 'all' });
		const bbcode = 'Line 1\nLine 2\nLine 3';
		const result = parser.parse(bbcode);
		expect(result.html).toBe('Line 1<br>Line 2<br>Line 3');
		expect(result.errors).toHaveLength(0);
	});

	it('should handle newlines with "none" mode', () => {
		const parser = new BBCodeParser({ preserveNewlines: 'none' });
		const bbcode = 'Line 1\nLine 2\n\nLine 3';
		const result = parser.parse(bbcode);
		expect(result.html).toBe('Line 1 Line 2 Line 3');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse deeply nested tags', () => {
		const bbcode = '[b][i][u][s]nested text[/s][/u][/i][/b]';
		const result = parser.parse(bbcode);
		expect(result.html).toBe('<strong><em><u><s>nested text</s></u></em></strong>');
		expect(result.errors).toHaveLength(0);
	});
});

describe('BBCodeParser - Convenience Functions', () => {
	it('should use parseBBCode function', () => {
		const html = parseBBCode('[b]bold[/b]');
		expect(html).toBe('<strong>bold</strong>');
	});

	it('should use parseBBCodeSafe function', () => {
		const result = parseBBCodeSafe('[b]bold[/b]');
		expect(result.html).toBe('<strong>bold</strong>');
		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should return errors with parseBBCodeSafe', () => {
		const result = parseBBCodeSafe('[b]unclosed', { strictMode: true, allowUnclosedTags: false });
		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});
});

describe('BBCodeParser - Validation', () => {
	const parser = new BBCodeParser();

	it('should validate correct BBCode', () => {
		const validation = parser.validate('[b]text[/b]');
		expect(validation.isValid).toBe(true);
		expect(validation.errors).toHaveLength(0);
	});

	it('should invalidate incorrect BBCode', () => {
		const parser2 = new BBCodeParser({ strictMode: true, allowUnclosedTags: false });
		const validation = parser2.validate('[b]unclosed');
		expect(validation.isValid).toBe(false);
		expect(validation.errors.length).toBeGreaterThan(0);
	});
});

describe('BBCodeParser - getSupportedTags', () => {
	const parser = new BBCodeParser();

	it('should return list of supported tags', () => {
		const tags = parser.getSupportedTags();
		expect(tags).toContain('b');
		expect(tags).toContain('i');
		expect(tags).toContain('url');
		expect(tags).toContain('img');
		expect(tags).toContain('list');
		expect(tags).toContain('previewyoutube');
		expect(tags).toContain('video');
	});
});

describe('BBCodeParser - Real-World Examples', () => {
	it('should parse Steam patch notes format', () => {
		const parser = new BBCodeParser({
			steamClanImageUrl: 'https://clan.akamai.steamstatic.com/images/'
		});

		const bbcode = `
[h1]Patch Notes v1.2.3[/h1]

[h2]New Features[/h2]
[list]
[*][b]Feature 1[/b] - Description
[*][b]Feature 2[/b] - Description
[/list]

[h2]Bug Fixes[/h2]
[list]
[*]Fixed issue with [i]something[/i]
[*]Improved performance
[/list]

[img]{STEAM_CLAN_IMAGE}/header.jpg[/img]

[previewyoutube=ABC123;full][/previewyoutube]

[url=https://example.com]Learn more[/url]
		`.trim();

		const result = parser.parse(bbcode);

		expect(result.html).toContain('<h1>Patch Notes v1.2.3</h1>');
		expect(result.html).toContain('<h2>New Features</h2>');
		expect(result.html).toContain('<ul>');
		expect(result.html).toContain('<li><strong>Feature 1</strong> - Description');
		expect(result.html).toContain('<li><strong>Feature 2</strong> - Description');
		expect(result.html).toContain('https://clan.akamai.steamstatic.com/images/');
		expect(result.html).toContain('https://img.youtube.com/vi/ABC123/hqdefault.jpg');
		expect(result.html).toContain('<a href="https://example.com">Learn more</a>');
		expect(result.errors).toHaveLength(0);
	});
});
