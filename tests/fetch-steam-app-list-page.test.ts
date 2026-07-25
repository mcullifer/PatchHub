import { fetchSteamAppListPage } from '$convex/lib/steam';
import { describe, expect, it } from 'vitest';

describe('fetchSteamAppListPage', () => {
	it('normalizes a final page when Steam omits pagination fields', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {
						apps: [
							{ appid: 4783350, name: 'Retro Futbol' },
							{ appid: 4783400, name: 'CIRCLO' }
						]
					}
				})
			);

		const page = await fetchSteamAppListPage({
			apiKey: 'test-key',
			lastAppId: 4783340,
			fetchFn
		});

		expect(page).toEqual({
			apps: [
				{ appid: 4783350, name: 'Retro Futbol' },
				{ appid: 4783400, name: 'CIRCLO' }
			],
			haveMoreResults: false,
			lastAppId: 4783400
		});
	});

	it('normalizes an empty response as complete at the requested cursor', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {}
				})
			);

		const page = await fetchSteamAppListPage({
			apiKey: 'test-key',
			lastAppId: 4843820,
			fetchFn
		});

		expect(page).toEqual({
			apps: [],
			haveMoreResults: false,
			lastAppId: 4843820
		});
	});

	it('filters malformed app rows without rejecting the whole page', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {
						apps: [
							{ appid: 'not-a-number', name: 'Broken App' },
							{ appid: 123, name: 'Working App' }
						],
						have_more_results: false,
						last_appid: 123
					}
				})
			);

		const page = await fetchSteamAppListPage({
			apiKey: 'test-key',
			fetchFn
		});

		expect(page.apps).toEqual([{ appid: 123, name: 'Working App' }]);
	});

	it('rejects responses whose overall shape is unexpected', async () => {
		const fetchFn: typeof fetch = async () => new Response(JSON.stringify({ nope: true }));

		await expect(fetchSteamAppListPage({ apiKey: 'test-key', fetchFn })).rejects.toThrow(
			'Steam app list response had an unexpected shape'
		);
	});

	it('throws for non-OK responses', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 });

		await expect(fetchSteamAppListPage({ apiKey: 'test-key', fetchFn })).rejects.toThrow(
			'Steam app list request failed with status 503'
		);
	});

	it('preserves network failures', async () => {
		const networkError = new Error('socket closed');
		const fetchFn: typeof fetch = async () => {
			throw networkError;
		};

		await expect(fetchSteamAppListPage({ apiKey: 'test-key', fetchFn })).rejects.toBe(networkError);
	});
});
