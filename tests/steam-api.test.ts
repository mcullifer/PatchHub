import { UPSTREAM_FETCH_OPTIONS } from '$lib/server/http/boundedFetch';
import { fetchGameNews, fetchPopularGames } from '$lib/server/steam/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
	vi.stubEnv('STEAM_API_URL', 'https://steam.test');
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

describe('fetchPopularGames', () => {
	it('returns game rankings', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {
						last_update: 123,
						ranks: [
							{
								rank: 1,
								appid: 730,
								concurrent_in_game: 900_000,
								peak_in_game: 1_200_000
							}
						]
					}
				})
			);

		await expect(fetchPopularGames(fetchFn)).resolves.toEqual({
			last_update: 123,
			ranks: [
				{
					rank: 1,
					appid: 730,
					concurrent_in_game: 900_000,
					peak_in_game: 1_200_000
				}
			]
		});
	});

	it('bounds Steam API request duration', async () => {
		vi.useFakeTimers();
		const fetchFn: typeof fetch = async (_input, init) => {
			return await new Promise<Response>((_resolve, reject) => {
				const signal = init?.signal;
				if (!signal) throw new Error('Expected an abort signal');
				signal.addEventListener('abort', () => reject(signal.reason), { once: true });
			});
		};

		const request = fetchPopularGames(fetchFn);
		const rejection = expect(request).rejects.toThrow(
			`Request timed out after ${UPSTREAM_FETCH_OPTIONS.timeoutMs}ms`
		);

		await vi.advanceTimersByTimeAsync(UPSTREAM_FETCH_OPTIONS.timeoutMs);
		await rejection;
	});
});

describe('fetchGameNews', () => {
	it('returns the complete Steam news contract', async () => {
		const fetchFn: typeof fetch = async (input) => {
			expect(input.toString()).toContain('count=10');
			return new Response(
				JSON.stringify({
					appnews: {
						appid: 730,
						count: 1,
						newsitems: [
							{
								appid: 730,
								author: 'Valve',
								contents: 'Patch notes',
								date: 123,
								feed_type: 1,
								feedlabel: 'Community Announcements',
								feedname: 'steam_community_announcements',
								gid: '456',
								is_external_url: true,
								tags: ['patchnotes'],
								title: 'Update',
								url: 'https://steam.test/news/456'
							}
						]
					}
				})
			);
		};

		await expect(fetchGameNews({ appId: 730, fetchFn })).resolves.toEqual({
			appnews: {
				appid: 730,
				count: 1,
				newsitems: [
					{
						appid: 730,
						author: 'Valve',
						contents: 'Patch notes',
						date: 123,
						feed_type: 1,
						feedlabel: 'Community Announcements',
						feedname: 'steam_community_announcements',
						gid: '456',
						is_external_url: true,
						tags: ['patchnotes'],
						title: 'Update',
						url: 'https://steam.test/news/456'
					}
				]
			}
		});
	});
});
