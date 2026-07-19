import { getSoftwareSource } from '$lib/server/software/SoftwareSourceRegistry';
import { Time } from '$lib/util/time';
import { describe, expect, it } from 'vitest';

describe('SoftwareSourceRegistry', () => {
	it('keeps existing sources on full rendering', () => {
		expect(getSoftwareSource('windows-11')?.rendering).toBe('full');
		expect(getSoftwareSource('nvidia-game-ready-drivers')?.rendering).toBe('full');
	});

	it('registers the Google Chrome stable feed', () => {
		expect(getSoftwareSource('google-chrome')).toMatchObject({
			slug: 'google-chrome',
			provider: 'Google Chrome Releases',
			vendor: 'Google',
			adapter: 'atom-feed',
			feedUrl: 'https://chromereleases.googleblog.com/feeds/posts/default/-/Stable%20updates',
			cacheTtlMs: Time.HOUR,
			rendering: 'excerpt',
			icon: 'web',
			imageUrl: '/google-chrome.png'
		});
	});

	it('registers the GitHub Changelog feed', () => {
		expect(getSoftwareSource('github-changelog')).toMatchObject({
			slug: 'github-changelog',
			provider: 'GitHub Changelog',
			vendor: 'GitHub',
			adapter: 'atom-feed',
			feedUrl: 'https://github.blog/changelog/feed/',
			cacheTtlMs: Time.MINUTE * 30,
			rendering: 'excerpt',
			icon: 'code',
			imageUrl: '/github-changelog.png'
		});
	});
});
