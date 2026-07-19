import { getAppListPage, SteamApiError } from '$lib/server/steam/SteamApiClient';
import { describe, expect, it } from 'vitest';

describe('SteamApiClient.getAppListPage', () => {
	it('normalizes final app-list pages when Steam omits pagination fields', async () => {
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

		const page = await getAppListPage({
			apiKey: 'test-key',
			apiBaseUrl: 'https://steam.test',
			lastAppId: 4783340,
			fetchFn
		});

		expect(page.response).toEqual({
			apps: [
				{ appid: 4783350, name: 'Retro Futbol' },
				{ appid: 4783400, name: 'CIRCLO' }
			],
			have_more_results: false,
			last_appid: 4783400
		});
	});

	it('normalizes empty app-list responses as complete at the requested cursor', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {}
				})
			);

		const page = await getAppListPage({
			apiKey: 'test-key',
			apiBaseUrl: 'https://steam.test',
			lastAppId: 4843820,
			fetchFn
		});

		expect(page.response).toEqual({
			apps: [],
			have_more_results: false,
			last_appid: 4843820
		});
	});

	it('throws a typed error for non-OK app-list responses', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 });

		await expect(
			getAppListPage({
				apiKey: 'test-key',
				apiBaseUrl: 'https://steam.test',
				fetchFn
			})
		).rejects.toMatchObject({
			code: 'http_error',
			status: 503
		} satisfies Partial<SteamApiError>);
	});

	it('throws a typed error for invalid app-list response shapes', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {
						apps: [{ appid: 'not-a-number', name: 'Broken App' }],
						have_more_results: false,
						last_appid: 123
					}
				})
			);

		await expect(
			getAppListPage({
				apiKey: 'test-key',
				apiBaseUrl: 'https://steam.test',
				fetchFn
			})
		).rejects.toMatchObject({
			code: 'invalid_response'
		} satisfies Partial<SteamApiError>);
	});

	it('throws a typed error for app-list network failures', async () => {
		const networkError = new Error('socket closed');
		const fetchFn: typeof fetch = async () => {
			throw networkError;
		};

		await expect(
			getAppListPage({
				apiKey: 'test-key',
				apiBaseUrl: 'https://steam.test',
				fetchFn
			})
		).rejects.toMatchObject({
			code: 'network_error',
			cause: networkError
		} satisfies Partial<SteamApiError>);
	});
});
