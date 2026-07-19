import { normalizeSoftwareFeedItem } from '$lib/server/software/SoftwareFeedNormalizer';
import { describe, expect, it } from 'vitest';

describe('SoftwareFeedNormalizer', () => {
	it('normalizes feed entries into software update DTOs', () => {
		const entry = normalizeSoftwareFeedItem(
			{
				id: 'tag:microsoft.com,2026:kb5083631',
				title: 'May 9, 2026-KB5083631 (OS Build 26200.8328)',
				url: 'https://support.microsoft.com/help/5083631',
				summary: '<p>Windows 11, version 25H2 cumulative update.</p>',
				content: '<p>Windows 11, version 25H2 cumulative update.</p>',
				published: '2026-05-09T16:00:00Z',
				authors: [{ name: 'Microsoft Support' }]
			},
			'windows-11',
			'full'
		);

		expect(entry).toMatchObject({
			id: 'tag:microsoft.com,2026:kb5083631',
			title: 'May 9, 2026-KB5083631 (OS Build 26200.8328)',
			sourceUrl: 'https://support.microsoft.com/help/5083631',
			publishedAt: '2026-05-09T16:00:00.000Z',
			authors: ['Microsoft Support'],
			metadata: {
				kbId: 'KB5083631',
				build: '26200.8328',
				windowsVersion: '25H2'
			}
		});
		expect(entry.summary).toBe('Windows 11, version 25H2 cumulative update.');
		expect(entry.contentHtml).toBe('<p>Windows 11, version 25H2 cumulative update.</p>');
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
		expect(entry.metadata.kbId).toBeNull();
	});
});
