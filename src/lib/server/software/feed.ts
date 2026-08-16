import type { SoftwareFeedRendering, SoftwareUpdateEntry } from '$lib/models/Software';
import { createSlug } from '$convex/lib/strings';

export type FeedItemLike = {
	id?: string | null;
	title?: string | null;
	url?: string | null;
	content?: string | null;
	summary?: string | null;
	description?: string | null;
	published?: string | Date | null;
	updated?: string | Date | null;
	authors?: Array<string | { name?: string | null }> | null;
};

export function normalizeSoftwareFeedItem(
	item: FeedItemLike,
	sourceSlug: string,
	rendering: SoftwareFeedRendering
): SoftwareUpdateEntry {
	const title = item.title?.trim() || 'Untitled update';
	const sourceUrl = item.url?.trim() || '';
	const updatedAt = normalizeDate(item.updated);
	const publishedAt = normalizeDate(item.published) ?? updatedAt;
	const fallbackId = createSlug(title, sourceSlug);
	const id = item.id?.trim() || sourceUrl || `${sourceSlug}-${fallbackId}`;
	const feedSummary = item.summary?.trim() || item.description?.trim() || null;
	const summarySource =
		rendering === 'excerpt'
			? (feedSummary ?? item.content ?? '')
			: (item.summary ?? item.content ?? item.description ?? '');
	const maxSummaryLength = rendering === 'excerpt' && !feedSummary ? 200 : 220;
	const summary = getSummary(summarySource, maxSummaryLength, rendering === 'excerpt');
	const contentHtml = item.content ?? item.description ?? item.summary ?? null;

	return {
		id,
		title,
		summary,
		contentHtml: rendering === 'full' ? contentHtml : null,
		sourceUrl,
		publishedAt,
		updatedAt,
		authors: normalizeAuthors(item.authors),
		metadata: {}
	};
}

function normalizeDate(value: string | Date | null | undefined): string | null {
	if (!value) return null;

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return date.toISOString();
}

function normalizeAuthors(authors: FeedItemLike['authors']): string[] {
	if (!authors) return [];

	return authors
		.map((author) => {
			if (typeof author === 'string') return author;
			return author.name ?? '';
		})
		.map((author) => author.trim())
		.filter((author) => author.length > 0);
}

function getSummary(value: string, maxLength: number, decodeEntities: boolean): string {
	const withoutHtml = value.replace(/<[^>]*>/g, ' ');
	const text = (decodeEntities ? decodeHtmlEntities(withoutHtml) : withoutHtml)
		.replace(/\s+/g, ' ')
		.trim();

	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 3)}...`;
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&#(\d+);/g, (entity, code: string) => decodeCodePoint(entity, Number(code)))
		.replace(/&#x([\da-f]+);/gi, (entity, code: string) =>
			decodeCodePoint(entity, Number.parseInt(code, 16))
		)
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&quot;/gi, '"')
		.replace(/&apos;|&#39;/gi, "'")
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>');
}

function decodeCodePoint(entity: string, codePoint: number): string {
	if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return entity;
	return String.fromCodePoint(codePoint);
}
