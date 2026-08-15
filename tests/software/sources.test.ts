import { getSoftwareSource } from '$lib/server/software/sources';
import { Time } from '$lib/util/time';
import { describe, expect, it } from 'vitest';

describe('source registry', () => {
	it('keeps the NVIDIA source on full rendering', () => {
		expect(getSoftwareSource('nvidia-game-ready-drivers')?.rendering).toBe('full');
	});

	it('does not register the retired Windows 11 feed', () => {
		expect(getSoftwareSource('windows-11')).toBeNull();
	});

	it('registers the Google Chrome stable feed', () => {
		expect(getSoftwareSource('google-chrome')).toMatchObject({
			slug: 'google-chrome',
			provider: 'Google Chrome Releases',
			vendor: 'Google',
			adapter: 'atom-feed',
			upstreamUrl: 'https://chromereleases.googleblog.com/feeds/posts/default/-/Stable%20updates',
			cacheTtlMs: Time.MINUTE * 5,
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
			upstreamUrl: 'https://github.blog/changelog/feed/',
			cacheTtlMs: Time.MINUTE * 5,
			rendering: 'excerpt',
			icon: 'code',
			imageUrl: '/github-changelog.png'
		});
	});
});
