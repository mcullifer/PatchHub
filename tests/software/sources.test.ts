import { parseSoftwareSourceRecord } from '$lib/server/software/catalog';
import { describe, expect, it } from 'vitest';

describe('stored software sources', () => {
	it('preserves an unconfigured feed rendering value', () => {
		const { source } = parseSoftwareSourceRecord(
			createRecord('example-software', 'Example Software', {
				vendor: 'Example',
				provider: 'Example Releases',
				sourceType: 'RSS feed',
				imageUrl: 'https://example.com/software.png',
				adapter: 'atom-feed',
				feedUrl: 'https://example.com/releases.xml',
				searchUrl: null,
				supportUrl: null,
				releaseInfoUrl: null
			})
		);

		expect(source.rendering).toBeNull();
	});

	it('loads the Google Chrome feed from metadata', () => {
		const { source } = parseSoftwareSourceRecord(
			createRecord('google-chrome', 'Google Chrome', {
				vendor: 'Google',
				provider: 'Google Chrome Releases',
				sourceType: 'Atom feed',
				imageUrl: '/google-chrome.png',
				adapter: 'atom-feed',
				rendering: 'excerpt',
				feedUrl: 'https://chromereleases.googleblog.com/feeds/posts/default/-/Stable%20updates',
				searchUrl: null,
				supportUrl: 'https://support.google.com/chrome/',
				releaseInfoUrl: 'https://chromereleases.googleblog.com/'
			})
		);

		expect(source).toMatchObject({
			slug: 'google-chrome',
			provider: 'Google Chrome Releases',
			vendor: 'Google',
			adapter: 'atom-feed',
			upstreamUrl: 'https://chromereleases.googleblog.com/feeds/posts/default/-/Stable%20updates',
			cacheTtlMs: 300_000,
			rendering: 'excerpt',
			icon: 'rss_feed',
			imageUrl: '/google-chrome.png'
		});
	});

	it('uses a resolved Convex storage URL for uploaded card images', () => {
		const { source } = parseSoftwareSourceRecord({
			...createRecord('obs-studio', 'OBS Studio', {
				vendor: 'OBS Studio',
				provider: 'OBS Studio',
				sourceType: 'RSS feed',
				imageStorageId: 'storage-id',
				adapter: 'atom-feed',
				feedUrl: 'https://obsproject.com/blog/rss',
				searchUrl: null,
				supportUrl: null,
				releaseInfoUrl: null
			}),
			resolvedImageUrl: 'https://example.convex.cloud/api/storage/storage-id'
		});

		expect(source.imageUrl).toBe('https://example.convex.cloud/api/storage/storage-id');
	});
});

function createRecord(slug: string, name: string, metadata: Record<string, unknown>) {
	return {
		_id: `${slug}-id`,
		name,
		externalId: slug,
		slug,
		metadataJson: JSON.stringify(metadata)
	};
}
