import { readFileSync } from 'node:fs';
import { UPSTREAM_FETCH_OPTIONS } from '$lib/server/http/boundedFetch';
import { SoftwareUpdateService } from '$lib/server/software/SoftwareUpdateService';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const catalogMocks = vi.hoisted(() => ({
	upsertSource: vi.fn(async () => undefined),
	getExternalItemId: vi.fn(async () => null)
}));

vi.mock('$lib/server/cache/ConvexCache', () => ({
	ConvexCache: class {
		async getOrCreate<T>(
			...args: [key: string, create: () => Promise<T>, opts: { ttlMs: number }]
		): Promise<{ value: T; servedStale: boolean }> {
			return { value: await args[1](), servedStale: false };
		}
	}
}));

vi.mock('$lib/server/software/SoftwareCatalogService', () => ({
	SoftwareCatalogService: catalogMocks
}));

const chromeFixture = readFileSync(
	new URL('./fixtures/software/google-chrome-stable.xml', import.meta.url),
	'utf8'
);
const githubFixture = readFileSync(
	new URL('./fixtures/software/github-changelog.xml', import.meta.url),
	'utf8'
);

describe('SoftwareUpdateService', () => {
	beforeEach(() => {
		catalogMocks.upsertSource.mockClear();
	});

	it('normalizes Chrome desktop and ChromeOS stable posts as excerpts', async () => {
		const detail = await SoftwareUpdateService.getSourceDetail(
			'google-chrome',
			25,
			createFixtureFetch(chromeFixture)
		);

		expect(detail).not.toBeNull();
		const desktop = detail?.entries.find(
			(entry) => entry.title === 'Stable Channel Update for Desktop'
		);
		expect(desktop).toMatchObject({
			sourceUrl:
				'https://chromereleases.googleblog.com/2026/07/stable-channel-update-for-desktop_049796704.html',
			publishedAt: '2026-07-16T20:56:30.226Z',
			updatedAt: '2026-07-16T23:30:26.517Z',
			authors: ['Daniel Yip'],
			contentHtml: null
		});
		expect(desktop?.summary).toContain(
			'The Stable channel has been updated to 150.0.7871.128/.129'
		);

		const chromeOs = detail?.entries.find(
			(entry) => entry.title === 'Stable Channel Update for ChromeOS / ChromeOS Flex'
		);
		expect(chromeOs).toMatchObject({
			sourceUrl:
				'https://chromereleases.googleblog.com/2026/07/stable-channel-update-for-chromeos_0163471507.html',
			publishedAt: '2026-07-10T20:16:50.473Z',
			updatedAt: '2026-07-10T20:16:50.473Z',
			contentHtml: null
		});
		expect(chromeOs?.summary).toContain('The ChromeOS Stable channel is being updated');
		expect(detail?.entries.every((entry) => entry.summary.length <= 200)).toBe(true);
		expect(detail?.entries.every((entry) => !/<[^>]+>/.test(entry.summary))).toBe(true);
	});

	it('applies the requested Chrome entry cap', async () => {
		const detail = await SoftwareUpdateService.getSourceDetail(
			'google-chrome',
			2,
			createFixtureFetch(chromeFixture)
		);

		expect(detail?.entries).toHaveLength(2);
	});

	it('preserves GitHub canonical URLs and dates while using RSS descriptions', async () => {
		const detail = await SoftwareUpdateService.getSourceDetail(
			'github-changelog',
			25,
			createFixtureFetch(githubFixture)
		);

		expect(detail).not.toBeNull();
		expect(detail?.entries[0]).toMatchObject({
			sourceUrl:
				'https://github.blog/changelog/2026-07-17-repository-level-github-copilot-usage-metrics-generally-available',
			publishedAt: '2026-07-17T22:05:18.000Z',
			updatedAt: '2026-07-17T22:05:18.000Z',
			authors: ['Allison'],
			contentHtml: null
		});
		expect(detail?.entries[0]?.summary).toContain(
			'The Copilot usage metrics REST API now reports repository-level activity.'
		);
		expect(detail?.entries[0]?.summary).not.toContain('Full article body');
		expect(detail?.entries.every((entry) => !/<[^>]+>/.test(entry.summary))).toBe(true);
	});

	it('applies the requested GitHub entry cap', async () => {
		const detail = await SoftwareUpdateService.getSourceDetail(
			'github-changelog',
			2,
			createFixtureFetch(githubFixture)
		);

		expect(detail?.entries).toHaveLength(2);
	});
});

function createFixtureFetch(xml: string): typeof fetch {
	const fixtureFetch: typeof fetch = async (_input, init) => {
		expect(new Headers(init?.headers).get('user-agent')).toBe(UPSTREAM_FETCH_OPTIONS.userAgent);
		return new Response(xml, { status: 200 });
	};
	return fixtureFetch;
}
