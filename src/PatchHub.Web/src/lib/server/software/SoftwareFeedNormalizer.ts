import type { SoftwareUpdateEntry, SoftwareUpdateMetadata } from '$lib/models/Software';
import { createSlug } from '$convex/lib/strings';

export type FeedItemLike = {
	id?: string | null;
	title?: string | null;
	url?: string | null;
	content?: string | null;
	summary?: string | null;
	published?: string | Date | null;
	updated?: string | Date | null;
	authors?: Array<string | { name?: string | null }> | null;
};

export function normalizeSoftwareFeedItem(
	item: FeedItemLike,
	sourceSlug: string
): SoftwareUpdateEntry {
	const title = item.title?.trim() || 'Untitled update';
	const sourceUrl = item.url?.trim() || '';
	const publishedAt = normalizeDate(item.published);
	const updatedAt = normalizeDate(item.updated);
	const metadata = getWindowsUpdateMetadata(title, item.content ?? item.summary ?? '');
	const fallbackId = createSlug(title, sourceSlug);
	const id = item.id?.trim() || sourceUrl || `${sourceSlug}-${fallbackId}`;
	const summary = getSummary(item.summary ?? item.content ?? '');

	return {
		id,
		title,
		summary,
		contentHtml: item.content ?? null,
		sourceUrl,
		publishedAt,
		updatedAt,
		authors: normalizeAuthors(item.authors),
		metadata
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

function getSummary(value: string): string {
	const text = value
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	if (text.length <= 220) return text;
	return `${text.slice(0, 217)}...`;
}

function getWindowsUpdateMetadata(title: string, content: string): SoftwareUpdateMetadata {
	const text = `${title} ${content}`;
	const kbId = text.match(/\bKB\d{6,8}\b/i)?.[0]?.toUpperCase() ?? null;
	const build = text.match(/\b\d{5}\.\d{3,5}\b/)?.[0] ?? null;
	const windowsVersion = text.match(/\b\d{2}H\d\b/i)?.[0]?.toUpperCase() ?? null;

	return {
		kbId,
		build,
		windowsVersion,
		updateType: null,
		servicingChannel: null,
		driverVersion: null,
		releaseNotesUrl: null,
		downloadUrl: null
	};
}
