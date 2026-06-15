import type { ISteamAppListResponse } from '$lib/models/Steam';
import { syncSteamCatalog } from '$lib/server/steam/SteamCatalogSync';
import { describe, expect, it } from 'vitest';

describe('syncSteamCatalog', () => {
	it('marks the sync failed when Steam app-list fetching throws', async () => {
		const steamError = new Error('Steam API unavailable');
		let failedError: unknown;
		let importCalled = false;

		await expect(
			syncSteamCatalog(
				{ maxPages: 1 },
				{
					getCursor: async () => 10,
					markStarted: async () => {},
					fetchAppListPage: async () => {
						throw steamError;
					},
					importAppListPage: async () => {
						importCalled = true;
						return 0;
					},
					markFailed: async (error) => {
						failedError = error;
					}
				}
			)
		).rejects.toThrow('Steam API unavailable');

		expect(failedError).toBe(steamError);
		expect(importCalled).toBe(false);
	});

	it('advances the in-memory cursor only after a successful import', async () => {
		const response = createAppListResponse({
			appid: 25,
			name: 'Cursor Game',
			last_modified: 123,
			price_change_number: 456
		});
		const events: string[] = [];

		const result = await syncSteamCatalog(
			{ maxPages: 1, batchSize: 1 },
			{
				getCursor: async () => 10,
				markStarted: async (cursor) => {
					events.push(`started:${cursor}`);
				},
				fetchAppListPage: async (cursor) => {
					events.push(`fetch:${cursor}`);
					return response;
				},
				importAppListPage: async (page) => {
					events.push(`import:${page.cursor}`);
					return page.apps.length;
				},
				markFailed: async () => {
					events.push('failed');
				}
			}
		);

		expect(result).toEqual({
			batchesFetched: 1,
			appsImported: 1,
			finalCursor: 25,
			haveMoreResults: false
		});
		expect(events).toEqual(['started:10', 'fetch:10', 'import:25']);
	});

	it('continues fetching pages until Steam says there are no more results', async () => {
		const responses = [
			createAppListResponse(
				{
					appid: 25,
					name: 'First Cursor Game',
					last_modified: 123,
					price_change_number: 456
				},
				true
			),
			createAppListResponse(
				{
					appid: 30,
					name: 'Second Cursor Game',
					last_modified: 124,
					price_change_number: 457
				},
				false
			)
		];
		const fetchedCursors: Array<number | null> = [];
		const importedCursors: Array<number | null> = [];

		const result = await syncSteamCatalog(
			{ batchSize: 1 },
			{
				getCursor: async () => 10,
				markStarted: async () => {},
				fetchAppListPage: async (cursor) => {
					fetchedCursors.push(cursor);
					const response = responses.shift();
					if (!response) throw new Error('Unexpected extra fetch');
					return response;
				},
				importAppListPage: async (page) => {
					importedCursors.push(page.cursor);
					return page.apps.length;
				},
				markFailed: async () => {}
			}
		);

		expect(result).toEqual({
			batchesFetched: 2,
			appsImported: 2,
			finalCursor: 30,
			haveMoreResults: false
		});
		expect(fetchedCursors).toEqual([10, 25]);
		expect(importedCursors).toEqual([25, 30]);
	});
});

function createAppListResponse(
	app: ISteamAppListResponse['response']['apps'][number],
	haveMoreResults = false
): ISteamAppListResponse {
	return {
		response: {
			apps: [app],
			have_more_results: haveMoreResults,
			last_appid: app.appid
		}
	};
}
