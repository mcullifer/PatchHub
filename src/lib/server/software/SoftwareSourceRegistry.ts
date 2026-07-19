import type { SoftwareSource } from '$lib/models/Software';
import { Time } from '$lib/util/time';

export const softwareSources = {
	'windows-11': {
		id: 'windows-11',
		name: 'Windows 11',
		slug: 'windows-11',
		vendor: 'Microsoft',
		provider: 'Microsoft Support',
		sourceType: 'Atom feed',
		description: 'Windows 11 release notes, cumulative updates, and support articles.',
		icon: 'desktop_windows',
		imageUrl:
			'https://cdn-dynmedia-1.microsoft.com/is/image/microsoftcorp/MSFT-Windows-11-Search-bar?scl=1',
		imageAlt: 'Windows 11 desktop interface',
		adapter: 'atom-feed',
		feedUrl: 'https://support.microsoft.com/en-us/feed/atom/4ec863cc-2ecd-e187-6cb3-b50c6545db92',
		searchUrl: null,
		supportUrl: 'https://support.microsoft.com/en-us/windows/windows-11-release-information',
		releaseInfoUrl:
			'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
		cacheTtlMs: Time.HOUR,
		rendering: 'full'
	},
	'nvidia-game-ready-drivers': {
		id: 'nvidia-game-ready-drivers',
		name: 'NVIDIA Game Ready Drivers',
		slug: 'nvidia-game-ready-drivers',
		vendor: 'NVIDIA',
		provider: 'NVIDIA Driver Downloads',
		sourceType: 'Driver search',
		description: 'GeForce Game Ready driver release highlights and fixed issue lists.',
		icon: 'memory',
		imageUrl:
			'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/graphic-cards/50-series/geforce-rtx-50series-og-1200x630.jpg',
		imageAlt: 'NVIDIA GeForce RTX graphics cards',
		adapter: 'nvidia-driver-search',
		feedUrl: null,
		searchUrl:
			'https://www.nvidia.com/Download/processFind.aspx?psid=131&pfid=1066&osid=135&lid=1&whql=1&ctk=0&dtcid=1',
		supportUrl: 'https://www.nvidia.com/en-us/geforce/drivers/',
		releaseInfoUrl: null,
		cacheTtlMs: Time.HOUR,
		rendering: 'full'
	},
	'google-chrome': {
		id: 'google-chrome',
		name: 'Google Chrome',
		slug: 'google-chrome',
		vendor: 'Google',
		provider: 'Google Chrome Releases',
		sourceType: 'Atom feed',
		description: 'Stable channel updates for Chrome desktop, mobile, and ChromeOS releases.',
		icon: 'web',
		imageUrl: '/google-chrome.png',
		imageAlt: 'Google Chrome browser',
		adapter: 'atom-feed',
		feedUrl: 'https://chromereleases.googleblog.com/feeds/posts/default/-/Stable%20updates',
		searchUrl: null,
		supportUrl: 'https://support.google.com/chrome/',
		releaseInfoUrl: 'https://chromereleases.googleblog.com/',
		cacheTtlMs: Time.HOUR,
		rendering: 'excerpt'
	},
	'github-changelog': {
		id: 'github-changelog',
		name: 'GitHub Changelog',
		slug: 'github-changelog',
		vendor: 'GitHub',
		provider: 'GitHub Changelog',
		sourceType: 'RSS feed',
		description: 'Product and platform updates published in the GitHub Changelog.',
		icon: 'code',
		imageUrl: '/github-changelog.png',
		imageAlt: 'GitHub logo',
		adapter: 'atom-feed',
		feedUrl: 'https://github.blog/changelog/feed/',
		searchUrl: null,
		supportUrl: 'https://support.github.com/',
		releaseInfoUrl: 'https://github.blog/changelog/',
		cacheTtlMs: Time.MINUTE * 30,
		rendering: 'excerpt'
	}
} as const satisfies Record<string, SoftwareSource>;

export type SoftwareSourceSlug = keyof typeof softwareSources;

export function getSoftwareSource(slug: string): SoftwareSource | null {
	return softwareSources[slug as SoftwareSourceSlug] ?? null;
}

export function getSoftwareSources(): SoftwareSource[] {
	return Object.values(softwareSources);
}
