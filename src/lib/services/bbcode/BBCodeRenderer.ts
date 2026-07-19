import type { BBCodeNode, ElementNode, ParseOptions } from './types';

const allowedSchemes = new Set(['http:', 'https:', 'mailto:']);
const namedColors = new Set([
	'black',
	'blue',
	'gray',
	'green',
	'grey',
	'orange',
	'purple',
	'red',
	'white',
	'yellow'
]);
const sizeClasses: Record<string, string> = {
	'1': 'bbcode-size-xs',
	'2': 'bbcode-size-sm',
	'3': 'bbcode-size-md',
	'4': 'bbcode-size-lg',
	'5': 'bbcode-size-xl',
	small: 'bbcode-size-sm',
	normal: 'bbcode-size-md',
	large: 'bbcode-size-lg',
	huge: 'bbcode-size-xl'
};

export class BBCodeRenderer {
	private readonly options: Required<Pick<ParseOptions, 'preserveNewlines' | 'steamClanImageUrl'>>;

	constructor(options: ParseOptions = {}) {
		this.options = {
			preserveNewlines: options.preserveNewlines ?? 'none',
			steamClanImageUrl: options.steamClanImageUrl ?? 'https://clan.akamai.steamstatic.com/images/'
		};
	}

	render(node: BBCodeNode): string {
		if (node.type === 'document') return this.renderChildren(node.children);
		if (node.type === 'text') return this.renderText(node.value);
		return this.renderElement(node);
	}

	private renderChildren(nodes: BBCodeNode[]): string {
		return normalizeBreaksAroundBlocks(nodes.map((node) => this.render(node)).join(''));
	}

	private renderText(value: string): string {
		const escaped = escapeHtml(unescapeBBCodeDelimiters(value));
		if (this.options.preserveNewlines === 'all') return escaped.replace(/\n/g, '<br>');
		if (this.options.preserveNewlines === 'double') {
			return escaped.replace(/\n{2,}/g, ' <br>').replace(/\n/g, ' ');
		}
		return escaped.replace(/\n+/g, ' ');
	}

	private renderElement(node: ElementNode): string {
		const content = this.renderChildren(node.children);
		const textContent = getPlainText(node.children);

		switch (node.tag.name) {
			case 'b':
				return `<strong>${content}</strong>`;
			case 'i':
				return `<em>${content}</em>`;
			case 'u':
				return `<u>${content}</u>`;
			case 's':
			case 'strike':
				return `<s>${content}</s>`;
			case 'h1':
			case 'h2':
			case 'h3':
			case 'h4':
			case 'h5':
			case 'h6':
				return `<${node.tag.name}>${content}</${node.tag.name}>`;
			case 'quote':
				return `<blockquote>${content}</blockquote>`;
			case 'p':
				return `<p>${content}</p>`;
			case 'code':
				return `<code>${escapeHtml(textContent)}</code>`;
			case 'hr':
				return '<hr />';
			case 'list':
				return `<ul>${content}</ul>`;
			case 'olist':
				return `<ol>${content}</ol>`;
			case '*':
				return this.renderListItem(node);
			case 'table':
				return `<table>${content}</table>`;
			case 'tr':
				return `<tr>${content}</tr>`;
			case 'td':
				return `<td>${content}</td>`;
			case 'th':
				return `<th>${content}</th>`;
			case 'expand':
				return renderExpand(node, content);
			case 'url':
				return renderLink(node, content, textContent);
			case 'img':
				return this.renderImage(node, textContent);
			case 'carousel':
				return this.renderCarousel(node);
			case 'previewyoutube':
				return renderYouTubePreview(node);
			case 'video':
				return renderVideo(node);
			case 'color':
				return renderColor(node, content);
			case 'size':
				return renderSize(node, content);
			case 'spoiler':
				return renderDisclosure('Spoiler', content);
			default:
				return escapeHtml(node.tag.raw) + content;
		}
	}

	private renderImage(node: ElementNode, textContent: string): string {
		const rawSource = node.tag.attributes.src || node.tag.value || textContent.trim();
		const src = this.resolveSteamImageUrl(rawSource);
		if (!isSafeUrl(src, true))
			return escapeHtml(node.tag.raw + textContent + `[/${node.tag.name}]`);

		const alt = node.tag.attributes.alt ?? '';
		return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" />`;
	}

	private renderCarousel(node: ElementNode): string {
		const images = node.children
			.filter((child): child is ElementNode => child.type === 'element' && child.tag.name === 'img')
			.map((child) => this.renderImage(child, getPlainText(child.children)))
			.filter((image) => image.startsWith('<img'));
		if (images.length === 0) return '';
		if (images.length === 1) return images[0];

		const items = images
			.map((image) => `<div class="carousel-item w-[90%]">${image}</div>`)
			.join('');
		const chevron = (direction: 'prev' | 'next', glyph: string, position: string) =>
			`<button type="button" data-carousel-${direction} class="btn btn-circle absolute top-1/2 ${position} hidden -translate-y-1/2 sm:inline-flex" aria-label="${direction === 'prev' ? 'Previous' : 'Next'} image">${glyph}</button>`;
		return `<div class="not-prose relative my-4"><div class="carousel carousel-center rounded-box w-full gap-2" tabindex="0" role="region" aria-label="Image carousel">${items}</div>${chevron('prev', '❮', 'left-2')}${chevron('next', '❯', 'right-2')}</div>`;
	}

	private resolveSteamImageUrl(source: string): string {
		if (source.startsWith('{STEAM_CLAN_IMAGE}') || source.startsWith('{STEAM_CLAN_LOC_IMAGE}')) {
			return (
				this.options.steamClanImageUrl +
				source.replace(/^\{STEAM_CLAN(?:_LOC)?_IMAGE\}/, '').replace(/^\/+/, '')
			);
		}

		return source;
	}

	private renderListItem(node: ElementNode): string {
		return `<li>${this.renderChildren(getListItemChildren(node.children))}</li>`;
	}
}

function normalizeBreaksAroundBlocks(html: string): string {
	return html
		.replace(/\s*<br>\s*(?=<(?:blockquote|details|div|h[1-6]|hr|img|ol|table|ul|video)\b)/g, '')
		.replace(/(<(?:hr|img)\b[^>]*\/>)\s*<br>\s*/g, '$1')
		.replace(/(<\/(?:blockquote|details|div|h[1-6]|ol|table|ul|video)>)\s*<br>\s*/g, '$1');
}

function getListItemChildren(children: ElementNode['children']): ElementNode['children'] {
	const meaningfulChildren = children.filter(
		(child) => child.type !== 'text' || child.value.trim().length > 0
	);

	if (
		meaningfulChildren.length === 1 &&
		meaningfulChildren[0].type === 'element' &&
		meaningfulChildren[0].tag.name === 'p'
	) {
		return meaningfulChildren[0].children;
	}

	return children;
}

function renderLink(node: ElementNode, content: string, textContent: string): string {
	const href = node.tag.value || node.tag.attributes.url || textContent.trim();
	if (!isSafeUrl(href)) return content || escapeHtml(href);

	const label = content || escapeHtml(href);
	return `<a href="${escapeAttribute(href)}">${label}</a>`;
}

function renderExpand(node: ElementNode, content: string): string {
	const summary =
		node.tag.attributes.title || node.tag.attributes.summary || node.tag.attributes.label;
	const summaryText = summary && summary.trim().length > 0 ? summary.trim() : null;
	return renderDisclosure(summaryText, content);
}

function renderDisclosure(summary: string | null, content: string): string {
	const summaryContent = summary
		? escapeHtml(summary)
		: '<span class="sr-only">Toggle expanded content</span>';
	return `<details class="collapse collapse-arrow bg-base-300 border-base-content/10 not-prose my-4 border shadow-md"><summary class="collapse-title min-h-10 px-4 py-2 text-base font-medium">${summaryContent}</summary><div class="collapse-content text-base leading-7 text-base-content/80">${content}</div></details>`;
}

function renderYouTubePreview(node: ElementNode): string {
	const videoId = sanitizeYouTubeId(node.tag.value || node.tag.attributes.previewyoutube || '');
	if (!videoId) return escapeHtml(node.tag.raw);

	const href = `https://www.youtube.com/watch?v=${videoId}`;
	const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
	return `<a href="${href}" class="bbcode-youtube-preview"><img src="${thumbnail}" alt="YouTube Video Thumbnail" /></a>`;
}

function renderVideo(node: ElementNode): string {
	const youtubeId = sanitizeYouTubeId(node.tag.value || node.tag.attributes.video || '');
	if (youtubeId) {
		const href = `https://www.youtube.com/watch?v=${youtubeId}`;
		const thumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
		return `<a href="${href}" class="bbcode-youtube-preview"><img src="${thumbnail}" alt="YouTube Video Thumbnail" /></a>`;
	}

	const sources = ['webm', 'mp4']
		.map((type) => {
			const source = node.tag.attributes[type];
			if (!source || !isSafeUrl(source, true)) return '';
			return `<source src="${escapeAttribute(source)}" type="video/${type}" />`;
		})
		.join('');

	if (!sources) return escapeHtml(node.tag.raw);

	const poster = node.tag.attributes.poster;
	const posterAttribute =
		poster && isSafeUrl(poster, true) ? ` poster="${escapeAttribute(poster)}"` : '';
	const autoplay = node.tag.attributes.autoplay === 'true' ? ' autoplay muted' : '';
	const loop = node.tag.attributes.loop === 'true' ? ' loop' : '';
	return `<video controls playsinline${posterAttribute}${autoplay}${loop}>${sources}</video>`;
}

function renderColor(node: ElementNode, content: string): string {
	const color = node.tag.value || node.tag.attributes.color || '';
	if (!isSafeColor(color)) return content;
	return `<span style="color: ${escapeAttribute(color)}">${content}</span>`;
}

function renderSize(node: ElementNode, content: string): string {
	const size = (node.tag.value || node.tag.attributes.size || '').toLowerCase();
	if (/^\d{1,2}px$/.test(size))
		return `<span style="font-size: ${escapeAttribute(size)}">${content}</span>`;
	const className = sizeClasses[size];
	if (!className) return content;
	return `<span class="${className}">${content}</span>`;
}

function sanitizeYouTubeId(value: string): string {
	const id = value
		.split(';')[0]
		.replace(/^["']|["']$/g, '')
		.trim();
	return /^[a-zA-Z0-9_-]{6,32}$/.test(id) ? id : '';
}

function isSafeColor(value: string): boolean {
	const normalized = value.trim().toLowerCase();
	return namedColors.has(normalized) || /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized);
}

function isSafeUrl(value: string, allowRelative = false): boolean {
	const trimmed = value.trim();
	if (!trimmed) return false;

	try {
		const url = new URL(trimmed, allowRelative ? 'https://patchhub.local' : undefined);
		if (allowRelative && url.origin === 'https://patchhub.local')
			return !/^[a-z][a-z0-9+.-]*:/i.test(trimmed);
		return allowedSchemes.has(url.protocol);
	} catch {
		return false;
	}
}

function getPlainText(nodes: BBCodeNode[]): string {
	return nodes
		.map((node) => {
			if (node.type === 'text') return node.value;
			if (node.type === 'element') return getPlainText(node.children);
			return getPlainText(node.children);
		})
		.join('');
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function unescapeBBCodeDelimiters(value: string): string {
	return value.replace(/\\./g, (match) => {
		const escapedCharacter = match[1];
		return escapedCharacter === '[' || escapedCharacter === ']' ? escapedCharacter : match;
	});
}

function escapeAttribute(value: string): string {
	return escapeHtml(value).replace(/`/g, '&#96;');
}
