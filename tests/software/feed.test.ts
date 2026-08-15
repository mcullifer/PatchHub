import { normalizeSoftwareFeedItem } from '$lib/server/software/feed';
import { describe, expect, it } from 'vitest';

describe('feed normalization', () => {
	it('normalizes feed entries into software update DTOs', () => {
		const entry = normalizeSoftwareFeedItem(
			{
				id: 'tag:example.com,2026:product-update',
				title: 'May 2026 product update',
				url: 'https://example.com/product-update',
				summary: '<p>New product capabilities are now available.</p>',
				content: '<p>New product capabilities are now available.</p>',
				published: '2026-05-09T16:00:00Z',
				authors: [{ name: 'Example Team' }]
			},
			'example-product',
			'full'
		);

		expect(entry).toMatchObject({
			id: 'tag:example.com,2026:product-update',
			title: 'May 2026 product update',
			sourceUrl: 'https://example.com/product-update',
			publishedAt: '2026-05-09T16:00:00.000Z',
			authors: ['Example Team'],
			metadata: {}
		});
		expect(entry.summary).toBe('New product capabilities are now available.');
		expect(entry.contentHtml).toBe('<p>New product capabilities are now available.</p>');
	});

	it('omits body HTML and prefers the feed description for excerpt sources', () => {
		const entry = normalizeSoftwareFeedItem(
			{
				title: 'Product update',
				description: '<p>A concise feed description.</p>',
				content: '<article><p>Complete third-party article body.</p></article>'
			},
			'excerpt-source',
			'excerpt'
		);

		expect(entry.summary).toBe('A concise feed description.');
		expect(entry.contentHtml).toBeNull();
	});

	it('derives a bounded plain-text summary when an excerpt feed has no description', () => {
		const entry = normalizeSoftwareFeedItem(
			{
				title: 'Product update',
				content: `<p>${'Body text &amp; details '.repeat(20)}</p>`
			},
			'excerpt-source',
			'excerpt'
		);

		expect(entry.summary.length).toBeLessThanOrEqual(200);
		expect(entry.summary).not.toContain('<p>');
		expect(entry.summary).toContain('Body text & details');
		expect(entry.contentHtml).toBeNull();
	});

	it('falls back to a stable local id and safe defaults', () => {
		const entry = normalizeSoftwareFeedItem(
			{
				title: 'Release notes'
			},
			'example-app',
			'full'
		);

		expect(entry.id).toBe('example-app-release-notes');
		expect(entry.title).toBe('Release notes');
		expect(entry.publishedAt).toBeNull();
		expect(entry.contentHtml).toBeNull();
		expect(entry.metadata).toEqual({});
	});
});
