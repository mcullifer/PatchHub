// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { register as registerRateLimiter } from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, internal } from './_generated/api';
import { fetchSteamAppListPage } from './lib/steam';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const SECRET = 'test-secret';
const TIPTAP_DOC = JSON.stringify({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Fixed a bug.' }] }]
});

function createTest() {
	const t = convexTest(schema, modules);
	registerRateLimiter(t);
	return t;
}

function asUser(t: ReturnType<typeof createTest>, authProviderId: string) {
	return t.withIdentity({ subject: authProviderId });
}

beforeEach(() => {
	vi.stubEnv('SERVER_SECRET', SECRET);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

type MockSteamPage = {
	apps?: Array<Record<string, unknown>>;
	haveMore?: boolean;
	lastAppId?: number;
	status?: number;
};

// Serves the given pages in request order and records each request URL so
// tests can assert which last_appid cursor was sent to Steam.
function stubSteamFetch(pages: MockSteamPage[]) {
	const requests: URL[] = [];
	vi.stubEnv('STEAM_API_KEY', 'steam-key');
	vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
		const url = new URL(String(input));
		requests.push(url);
		const page = pages[requests.length - 1] ?? { apps: [] };
		if (page.status !== undefined) return new Response('steam error', { status: page.status });
		const apps = page.apps ?? [];
		const lastAppId = apps.at(-1)?.appid;
		return new Response(
			JSON.stringify({
				response: {
					apps,
					have_more_results: page.haveMore ?? false,
					last_appid: page.lastAppId ?? (typeof lastAppId === 'number' ? lastAppId : undefined)
				}
			})
		);
	});
	return requests;
}

async function getSyncState(t: ReturnType<typeof createTest>) {
	return await t.run(async (ctx) => {
		return await ctx.db
			.query('steamCatalogSyncState')
			.withIndex('by_key', (q) => q.eq('key', 'singleton'))
			.unique();
	});
}

describe('cache', () => {
	it('roundtrips serialized values through set and get', async () => {
		const t = createTest();

		await t.mutation(api.cache.set, {
			secret: SECRET,
			key: 'roundtrip',
			value: JSON.stringify({ games: [10, 20] }),
			ttlMs: 60_000
		});

		const entry = await t.query(api.cache.get, { secret: SECRET, key: 'roundtrip' });
		expect(entry).toMatchObject({ value: '{"games":[10,20]}' });
		expect(entry?.expiresAt).toBeGreaterThan(Date.now());
	});

	it('returns expired entries as stale inventory', async () => {
		const t = createTest();
		await t.run(async (ctx) => {
			await ctx.db.insert('cacheEntries', {
				key: 'expired',
				value: '"stale"',
				expiresAt: Date.now() - 1000,
				updatedAt: Date.now() - 2000
			});
		});

		await expect(t.query(api.cache.get, { secret: SECRET, key: 'expired' })).resolves.toEqual({
			value: '"stale"',
			expiresAt: expect.any(Number)
		});
	});

	it('allows only one concurrent claimant for a missing key', async () => {
		const t = createTest();
		const claim = () =>
			t.mutation(api.cache.claimRefetch, {
				secret: SECRET,
				key: 'missing',
				claimWindowMs: 30_000
			});

		const results = await Promise.all([claim(), claim()]);
		expect(results.toSorted()).toEqual([false, true]);
	});

	it('allows only one concurrent claimant for an expired key', async () => {
		const t = createTest();
		await t.run(async (ctx) => {
			await ctx.db.insert('cacheEntries', {
				key: 'expired',
				value: '"stale"',
				expiresAt: Date.now() - 1000,
				updatedAt: Date.now() - 2000
			});
		});
		const claim = () =>
			t.mutation(api.cache.claimRefetch, {
				secret: SECRET,
				key: 'expired',
				claimWindowMs: 30_000
			});

		const results = await Promise.all([claim(), claim()]);
		expect(results.toSorted()).toEqual([false, true]);
	});

	it('never allows a fresh key to be claimed', async () => {
		const t = createTest();
		await t.mutation(api.cache.set, {
			secret: SECRET,
			key: 'fresh',
			value: '"fresh"',
			ttlMs: 60_000
		});

		await expect(
			t.mutation(api.cache.claimRefetch, {
				secret: SECRET,
				key: 'fresh',
				claimWindowMs: 30_000
			})
		).resolves.toBe(false);
	});

	it('clears an outstanding claim when setting a value', async () => {
		const t = createTest();
		await t.mutation(api.cache.claimRefetch, {
			secret: SECRET,
			key: 'claimed',
			claimWindowMs: 30_000
		});
		await t.mutation(api.cache.set, {
			secret: SECRET,
			key: 'claimed',
			value: '"value"',
			ttlMs: 60_000
		});

		const entry = await t.run(async (ctx) => {
			return await ctx.db
				.query('cacheEntries')
				.withIndex('by_key', (index) => index.eq('key', 'claimed'))
				.unique();
		});
		expect(entry?.refetchClaimedAt).toBeUndefined();
	});
});

describe('users.getOrCreate', () => {
	it('creates a user with a normalized username and returns it on repeat calls', async () => {
		const t = createTest();
		const owner = asUser(t, 'workos_1');

		const created = await owner.mutation(api.users.getOrCreate, {
			email: 'owner@example.com',
			username: '  Owner123  ',
			createdAt: 1000,
			updatedAt: 2000
		});

		expect(created.username).toBe('owner123');
		expect(created.authProviderId).toBe('workos_1');
		expect(created.platformRole).toBe('member');
		await expect(owner.query(api.users.getCurrent, {})).resolves.toMatchObject({
			_id: created._id,
			authProviderId: 'workos_1'
		});
		await expect(t.query(api.users.getCurrent, {})).resolves.toBeNull();

		const again = await owner.mutation(api.users.getOrCreate, {
			username: 'different',
			createdAt: 3000,
			updatedAt: 4000
		});
		expect(again._id).toBe(created._id);
	});

	it('rejects a username that is already taken', async () => {
		const t = createTest();

		await asUser(t, 'workos_1').mutation(api.users.getOrCreate, {
			username: 'owner123',
			createdAt: 1000,
			updatedAt: 1000
		});

		await expect(
			asUser(t, 'workos_2').mutation(api.users.getOrCreate, {
				username: 'OWNER123',
				createdAt: 1000,
				updatedAt: 1000
			})
		).rejects.toThrow('Username is already taken');
	});

	it('rejects disabled accounts', async () => {
		const t = createTest();

		await t.run(async (ctx) => {
			await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000,
				deletedAt: 2000
			});
		});

		await expect(
			asUser(t, 'workos_1').mutation(api.users.getOrCreate, {
				username: 'owner123',
				createdAt: 1000,
				updatedAt: 1000
			})
		).rejects.toThrow('Account is disabled');
	});

	it('rejects unauthenticated calls', async () => {
		const t = createTest();

		await expect(
			t.mutation(api.users.getOrCreate, {
				username: 'owner123',
				createdAt: 1000,
				updatedAt: 1000
			})
		).rejects.toThrow('Not authenticated');
	});
});

describe('favorites', () => {
	it('adds, lists, and removes external item favorites idempotently', async () => {
		const t = createTest();
		const owner = asUser(t, 'workos_1');

		const { itemId } = await t.run(async (ctx) => {
			await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const itemId = await ctx.db.insert('externalItems', {
				name: 'Counter-Strike',
				normalizedName: 'COUNTERSTRIKE',
				type: 'steam',
				externalId: '10',
				appType: 'game',
				slug: 'counter-strike',
				searchName: 'counter strike',
				createdAt: 1000,
				updatedAt: 1000
			});
			return { itemId };
		});

		await owner.mutation(api.favorites.addExternalItem, {
			externalItemId: itemId
		});
		// Second add is a no-op, not an error
		await owner.mutation(api.favorites.addExternalItem, {
			externalItemId: itemId
		});

		const favorites = await owner.query(api.favorites.list, {});
		expect(favorites.externalItems).toHaveLength(1);
		expect(favorites.externalItems[0]).toMatchObject({
			id: itemId,
			externalId: '10'
		});

		await owner.mutation(api.favorites.removeExternalItem, {
			externalItemId: itemId
		});
		const afterRemove = await owner.query(api.favorites.list, {});
		expect(afterRemove.externalItems).toHaveLength(0);
	});

	it('uses the authenticated Convex identity for favorite mutations', async () => {
		const t = createTest();

		const { itemId } = await t.run(async (ctx) => {
			await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			await ctx.db.insert('users', {
				authProviderId: 'workos_2',
				username: 'otheruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const itemId = await ctx.db.insert('externalItems', {
				name: 'Counter-Strike',
				normalizedName: 'COUNTERSTRIKE',
				type: 'steam',
				externalId: '10',
				appType: 'game',
				slug: 'counter-strike',
				searchName: 'counter strike',
				createdAt: 1000,
				updatedAt: 1000
			});
			return { itemId };
		});

		const currentUser = t.withIdentity({ subject: 'workos_1' });
		await currentUser.mutation(api.favorites.addExternalItem, { externalItemId: itemId });

		const favorites = await currentUser.query(api.favorites.list, {});
		expect(favorites.externalItems).toHaveLength(1);
		expect(favorites.externalItems[0]).toMatchObject({ id: itemId });

		const otherUser = t.withIdentity({ subject: 'workos_2' });
		const otherFavorites = await otherUser.query(api.favorites.list, {});
		expect(otherFavorites.externalItems).toHaveLength(0);

		await currentUser.mutation(api.favorites.removeExternalItem, { externalItemId: itemId });
		const afterRemove = await currentUser.query(api.favorites.list, {});
		expect(afterRemove.externalItems).toHaveLength(0);
	});

	it('rejects favorite mutations without an authenticated identity', async () => {
		const t = createTest();

		const { itemId } = await t.run(async (ctx) => {
			return {
				itemId: await ctx.db.insert('externalItems', {
					name: 'Counter-Strike',
					normalizedName: 'COUNTERSTRIKE',
					type: 'steam',
					externalId: '10',
					appType: 'game',
					slug: 'counter-strike',
					searchName: 'counter strike',
					createdAt: 1000,
					updatedAt: 1000
				})
			};
		});

		await expect(
			t.mutation(api.favorites.addExternalItem, { externalItemId: itemId })
		).rejects.toThrow('Not authenticated');
	});

	it('rejects favorites queries for unknown users', async () => {
		const t = createTest();

		await expect(asUser(t, 'nobody').query(api.favorites.list, {})).rejects.toThrow(
			'User not found'
		);
	});
});

describe('steamSync.importBatch', () => {
	it('inserts new apps and updates existing ones on re-import', async () => {
		const t = createTest();

		const imported = await t.mutation(internal.steamSync.importBatch, {
			apps: [{ appid: 10, name: 'Counter-Strike' }]
		});
		expect(imported).toBe(1);

		const renamed = await t.mutation(internal.steamSync.importBatch, {
			apps: [{ appid: 10, name: 'Counter-Strike (Renamed)' }]
		});
		expect(renamed).toBe(1);

		const unchanged = await t.mutation(internal.steamSync.importBatch, {
			apps: [{ appid: 10, name: 'Counter-Strike (Renamed)' }]
		});
		expect(unchanged).toBe(0);

		const items = await t.run(async (ctx) => {
			return await ctx.db.query('externalItems').collect();
		});
		expect(items).toHaveLength(1);
		expect(items[0].name).toBe('Counter-Strike (Renamed)');
		expect(items[0].externalId).toBe('10');
		expect(items[0].type).toBe('steam');
	});

	it('does not duplicate an app repeated within a single batch', async () => {
		const t = createTest();

		const imported = await t.mutation(internal.steamSync.importBatch, {
			apps: [
				{ appid: 10, name: 'First Name' },
				{ appid: 10, name: 'Second Name' }
			]
		});
		expect(imported).toBe(1);

		const items = await t.run(async (ctx) => {
			return await ctx.db.query('externalItems').collect();
		});
		expect(items).toHaveLength(1);
		expect(items[0].name).toBe('Second Name');
	});

	it('skips malformed records without aborting the batch', async () => {
		const t = createTest();

		const imported = await t.mutation(internal.steamSync.importBatch, {
			apps: [
				{ appid: Number.NaN, name: 'Broken' },
				{ appid: -5, name: 'Negative' },
				{ appid: 10, name: 'Valid' }
			]
		});
		expect(imported).toBe(1);

		const items = await t.run(async (ctx) => {
			return await ctx.db.query('externalItems').collect();
		});
		expect(items).toHaveLength(1);
		expect(items[0].externalId).toBe('10');
	});

	it('advances the cursor in the same transaction as the batch', async () => {
		const t = createTest();

		await t.mutation(internal.steamSync.importBatch, {
			apps: [
				{ appid: 10, name: 'Counter-Strike' },
				{ appid: 440, name: 'Team Fortress 2' }
			]
		});
		expect(await getSyncState(t)).toMatchObject({ lastAppId: '440', status: 'running' });

		const skipped = await t.mutation(internal.steamSync.importBatch, {
			apps: [{ appid: Number.NaN, name: 'Broken' }]
		});
		expect(skipped).toBe(0);
		expect(await getSyncState(t)).toMatchObject({ lastAppId: '440' });
	});

	it('preserves the prior cursor when marking a sync failed', async () => {
		const t = createTest();

		await t.mutation(internal.steamSync.markStarted, { cursor: 10 });
		await t.mutation(internal.steamSync.markFailed, { message: 'Steam API unavailable' });

		expect(await getSyncState(t)).toMatchObject({
			lastAppId: '10',
			status: 'failed',
			lastError: 'Steam API unavailable'
		});
	});

	it('rejects invalid run options before marking the sync running', async () => {
		const t = createTest();

		await t.mutation(internal.steamSync.recordProgress, { cursor: 10, status: 'complete' });

		await expect(
			t.action(api.steamSync.runManual, {
				secret: SECRET,
				maxPages: 0
			})
		).rejects.toThrow('Steam sync maxPages must be a positive integer');

		await expect(
			t.action(api.steamSync.runManual, {
				secret: SECRET,
				batchSize: 5000
			})
		).rejects.toThrow('Steam app import batch size must be at most 2000');

		expect(await getSyncState(t)).toMatchObject({
			lastAppId: '10',
			status: 'complete'
		});
	});
});

describe('steamSync.runScheduled', () => {
	it('pages until the catalog is exhausted, continuing across scheduled actions', async () => {
		vi.useFakeTimers();
		const requests = stubSteamFetch([
			{
				apps: [
					{ appid: 10, name: 'Counter-Strike' },
					{ appid: 20, name: 'Team Fortress Classic' }
				],
				haveMore: true
			},
			{ apps: [{ appid: 30, name: 'Day of Defeat' }], haveMore: true },
			{ apps: [{ appid: 40, name: 'Deathmatch Classic' }] }
		]);
		const t = createTest();

		await t.action(internal.steamSync.runScheduled, { maxPages: 1 });
		await t.finishAllScheduledFunctions(vi.runAllTimers);

		expect(requests).toHaveLength(3);
		expect(requests[0].searchParams.get('last_appid')).toBeNull();
		expect(requests[1].searchParams.get('last_appid')).toBe('20');
		expect(requests[2].searchParams.get('last_appid')).toBe('30');

		const items = await t.run(async (ctx) => {
			return await ctx.db.query('externalItems').collect();
		});
		expect(items).toHaveLength(4);
		expect(await getSyncState(t)).toMatchObject({ lastAppId: '40', status: 'complete' });
	});

	it('keeps paging when every row on a page is malformed', async () => {
		const requests = stubSteamFetch([
			{ apps: [{ appid: 'bad', name: 'Broken' }], haveMore: true, lastAppId: 20 },
			{ apps: [{ appid: 30, name: 'Day of Defeat' }] }
		]);
		const t = createTest();

		await t.action(internal.steamSync.runScheduled, {});

		expect(requests).toHaveLength(2);
		expect(requests[1].searchParams.get('last_appid')).toBe('20');
		const items = await t.run(async (ctx) => {
			return await ctx.db.query('externalItems').collect();
		});
		expect(items).toHaveLength(1);
		expect(await getSyncState(t)).toMatchObject({ lastAppId: '30', status: 'complete' });
	});

	it('stops when Steam reports more results but the cursor cannot advance', async () => {
		const requests = stubSteamFetch([{ apps: [], haveMore: true }]);
		const t = createTest();

		await t.action(internal.steamSync.runScheduled, {});

		expect(requests).toHaveLength(1);
		expect(await getSyncState(t)).toMatchObject({ status: 'complete' });
	});

	it('completes immediately when the API returns no results', async () => {
		const requests = stubSteamFetch([{ apps: [] }]);
		const t = createTest();

		const result = await t.action(internal.steamSync.runScheduled, {});

		expect(requests).toHaveLength(1);
		expect(result).toMatchObject({ pagesFetched: 1, appsImported: 0, haveMoreResults: false });
		expect(await getSyncState(t)).toMatchObject({ status: 'complete' });
	});

	it('stops and records an error after too many continuations', async () => {
		const requests = stubSteamFetch([]);
		const t = createTest();

		const result = await t.action(internal.steamSync.runScheduled, { continuation: 25 });

		expect(result).toBeNull();
		expect(requests).toHaveLength(0);
		expect(await getSyncState(t)).toMatchObject({
			status: 'failed',
			lastError: expect.stringContaining('continuations')
		});
	});

	it('records a mid-run failure at the last durable cursor and resumes from it', async () => {
		const requests = stubSteamFetch([
			{ apps: [{ appid: 10, name: 'Counter-Strike' }], haveMore: true },
			{ status: 500 }
		]);
		const t = createTest();

		await expect(t.action(internal.steamSync.runScheduled, {})).rejects.toThrow(
			'Steam app list request failed with status 500'
		);
		expect(requests).toHaveLength(2);
		expect(await getSyncState(t)).toMatchObject({
			lastAppId: '10',
			status: 'failed',
			lastError: 'Steam app list request failed with status 500'
		});

		vi.unstubAllGlobals();
		const resumeRequests = stubSteamFetch([{ apps: [{ appid: 20, name: 'Half-Life' }] }]);

		await t.action(internal.steamSync.runScheduled, {});

		expect(resumeRequests[0].searchParams.get('last_appid')).toBe('10');
		const items = await t.run(async (ctx) => {
			return await ctx.db.query('externalItems').collect();
		});
		expect(items).toHaveLength(2);
		expect(await getSyncState(t)).toMatchObject({ lastAppId: '20', status: 'complete' });
	});
});

describe('fetchSteamAppListPage', () => {
	it('derives the final cursor from the last app when Steam omits pagination fields', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {
						apps: [{ appid: 25, name: 'Cursor Game' }]
					}
				})
			);

		const page = await fetchSteamAppListPage({
			apiKey: 'steam-key',
			lastAppId: 10,
			fetchFn
		});

		expect(page).toEqual({
			apps: [{ appid: 25, name: 'Cursor Game' }],
			haveMoreResults: false,
			lastAppId: 25
		});
	});

	it('skips malformed app rows without dropping the page', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {
						apps: [
							{ appid: '25', name: 'Wrong Type' },
							{ name: 'Missing Id' },
							{ appid: 30, name: 'Good Game' }
						]
					}
				})
			);

		const page = await fetchSteamAppListPage({ apiKey: 'steam-key', fetchFn });

		expect(page).toEqual({
			apps: [{ appid: 30, name: 'Good Game' }],
			haveMoreResults: false,
			lastAppId: 30
		});
	});

	it('rejects responses whose overall shape is unexpected', async () => {
		const fetchFn: typeof fetch = async () => new Response(JSON.stringify({ nope: true }));

		await expect(fetchSteamAppListPage({ apiKey: 'steam-key', fetchFn })).rejects.toThrow(
			'Steam app list response had an unexpected shape'
		);
	});
});

describe('catalog', () => {
	it('finds steam apps via search and by app id', async () => {
		const t = createTest();

		await t.mutation(internal.steamSync.importBatch, {
			apps: [
				{ appid: 10, name: 'Counter-Strike' },
				{ appid: 440, name: 'Team Fortress 2' }
			]
		});

		const results = await t.query(api.catalog.searchSteam, { query: 'counter' });
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({ appid: 10, name: 'Counter-Strike' });

		const byId = await t.query(api.catalog.getSteamAppByAppId, { appid: 440 });
		expect(byId).toMatchObject({ appid: 440, name: 'Team Fortress 2', slug: 'team-fortress-2' });

		const names = await t.query(api.catalog.getSteamAppNamesByAppIds, { appIds: [10, 999] });
		expect(names).toEqual({
			'10': { id: expect.any(String), name: 'Counter-Strike', slug: 'counter-strike' }
		});
	});
});

describe('projects.getOwnedBySlug', () => {
	it('finds the matching owner when many projects share the same slug', async () => {
		const t = createTest();

		await t.run(async (ctx) => {
			for (let index = 0; index < 60; index++) {
				const userId = await ctx.db.insert('users', {
					authProviderId: `workos_other_${index}`,
					username: `other${index}`,
					platformRole: 'member',
					createdAt: index,
					updatedAt: index
				});
				await ctx.db.insert('projects', {
					name: `Other Project ${index}`,
					normalizedName: `OTHER_PROJECT_${index}`,
					slug: 'patchhub',
					userId,
					createdAt: index,
					updatedAt: index
				});
			}

			const targetUserId = await ctx.db.insert('users', {
				authProviderId: 'workos_target',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId: targetUserId,
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		const project = await asUser(t, 'workos_target').query(api.projects.getOwnedBySlug, {
			createdBy: 'owner123',
			projectSlug: 'patchhub'
		});

		expect(project).toMatchObject({
			name: 'PatchHub',
			slug: 'patchhub'
		});
	});

	it('does not return projects owned by another user', async () => {
		const t = createTest();

		await t.run(async (ctx) => {
			const ownerId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			await ctx.db.insert('users', {
				authProviderId: 'workos_other',
				username: 'other123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId: ownerId,
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		await expect(
			asUser(t, 'workos_other').query(api.projects.getOwnedBySlug, {
				createdBy: 'owner123',
				projectSlug: 'patchhub'
			})
		).resolves.toBeNull();
	});
});

describe('projects.getOwnerProfile', () => {
	it('returns the newest active projects without capping before sorting', async () => {
		const t = createTest();

		await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});

			for (let index = 0; index < 130; index++) {
				await ctx.db.insert('projects', {
					name: `Project ${index}`,
					normalizedName: `PROJECT_${index}`,
					slug: `project-${index}`,
					userId,
					createdAt: index,
					updatedAt: index
				});
			}

			for (let index = 0; index < 5; index++) {
				await ctx.db.insert('projects', {
					name: `Deleted Project ${index}`,
					normalizedName: `DELETED_PROJECT_${index}`,
					slug: `deleted-project-${index}`,
					userId,
					createdAt: 1000 + index,
					updatedAt: 1000 + index,
					deletedAt: 2000 + index
				});
			}
		});

		const profile = await t.query(api.projects.getOwnerProfile, {
			secret: SECRET,
			createdBy: 'owner123'
		});

		expect(profile?.owner).toMatchObject({
			kind: 'user',
			id: expect.any(String),
			name: 'owner123'
		});
		expect(profile?.owner).toHaveProperty('authProviderId', 'workos_1');
		expect(profile?.projects).toHaveLength(100);
		expect(profile?.projects[0]).toMatchObject({
			name: 'Project 129',
			slug: 'project-129',
			updatedAt: 129
		});
		expect(profile?.projects[99]).toMatchObject({
			name: 'Project 30',
			slug: 'project-30',
			updatedAt: 30
		});
		expect(profile?.projects.some((project) => project.slug.startsWith('deleted-project'))).toBe(
			false
		);
	});

	it('returns the auth provider identity needed by the SvelteKit server', async () => {
		const t = createTest();

		await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		const serverProfile = await t.query(api.projects.getOwnerProfile, {
			secret: SECRET,
			createdBy: 'owner123'
		});

		expect(serverProfile?.owner).toMatchObject({
			kind: 'user',
			id: expect.any(String),
			name: 'owner123',
			authProviderId: 'workos_1'
		});
	});
});

describe('projects.create', () => {
	it('creates unique slugs for repeated project names owned by the same user', async () => {
		const t = createTest();
		const owner = asUser(t, 'workos_1');

		await t.run(async (ctx) => {
			await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		const firstProject = await owner.mutation(api.projects.create, {
			name: '  PatchHub  ',
			description: '  Release notes in one place  '
		});
		const secondProject = await owner.mutation(api.projects.create, {
			name: 'PatchHub'
		});

		expect(firstProject.slug).toBe('patchhub');
		expect(secondProject.slug).toBe('patchhub-2');

		const storedProject = await t.run(async (ctx) => {
			return await ctx.db.get(firstProject.id);
		});
		expect(storedProject).toMatchObject({
			name: 'PatchHub',
			normalizedName: 'PATCHHUB',
			description: 'Release notes in one place'
		});
	});

	it('rejects invalid project names and descriptions', async () => {
		const t = createTest();
		const owner = asUser(t, 'workos_1');

		await t.run(async (ctx) => {
			await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		await expect(
			owner.mutation(api.projects.create, {
				name: '   '
			})
		).rejects.toThrow('Project name is required');

		await expect(
			owner.mutation(api.projects.create, {
				name: 'PatchHub',
				description: 'x'.repeat(501)
			})
		).rejects.toThrow('Project description must be at most 500 characters');
	});

	it('rate limits project creation per user', async () => {
		const t = createTest();
		const owner = asUser(t, 'workos_1');

		await t.run(async (ctx) => {
			await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		for (let index = 1; index <= 3; index++) {
			await owner.mutation(api.projects.create, {
				name: `Project ${index}`
			});
		}

		await expect(
			owner.mutation(api.projects.create, {
				name: 'Project 4'
			})
		).rejects.toThrow('Too many new projects — please try again later.');
	});
});

describe('projects.update', () => {
	it('updates owned project metadata without changing its slug', async () => {
		const t = createTest();

		const projectId = await t.run(async (ctx) => {
			const ownerId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			await ctx.db.insert('users', {
				authProviderId: 'workos_other',
				username: 'otheruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			return await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				description: 'Old description',
				userId: ownerId,
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		await expect(
			asUser(t, 'workos_other').mutation(api.projects.update, {
				projectId,
				name: 'Renamed'
			})
		).rejects.toThrow('Not authorized');

		await expect(
			asUser(t, 'workos_owner').mutation(api.projects.update, {
				projectId,
				name: '  Renamed  ',
				description: '   '
			})
		).resolves.toEqual({ slug: 'patchhub' });

		const project = await t.run(async (ctx) => await ctx.db.get(projectId));
		expect(project).toMatchObject({
			name: 'Renamed',
			normalizedName: 'RENAMED',
			slug: 'patchhub'
		});
		expect(project?.description).toBeUndefined();
		expect(project?.updatedAt).toBeGreaterThan(1000);
	});
});

describe('projects project banners', () => {
	it('returns a resolved ready banner without exposing storage state', async () => {
		const t = createTest();

		await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const bannerStorageId = await ctx.storage.store(
				new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
			);
			await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				bannerStorageId,
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		const result = await t.query(api.projectPosts.listForProject, {
			createdBy: 'owneruser',
			projectSlug: 'patchhub'
		});

		expect(result?.project.banner).toMatchObject({ status: 'ready' });
		expect(result?.project.banner.url).toContain('/api/storage/');
		expect(result?.project).not.toHaveProperty('bannerStorageId');
		expect(result?.project).not.toHaveProperty('bannerUpload');
	});

	it('creates the project immediately with a pending upload attempt', async () => {
		const t = createTest();

		await t.run(async (ctx) => {
			await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		const created = await asUser(t, 'workos_owner').mutation(api.projects.create, {
			name: 'PatchHub',
			bannerUploadAttemptId: 'attempt-1'
		});
		const project = await t.run(async (ctx) => await ctx.db.get(created.id));
		const result = await t.query(api.projectPosts.listForProject, {
			createdBy: 'owneruser',
			projectSlug: 'patchhub'
		});

		expect(created.bannerUpload).toMatchObject({ attemptId: 'attempt-1' });
		expect(created.bannerUpload?.uploadUrl).toContain('/api/storage/upload');
		expect(project?.bannerUpload).toMatchObject({
			status: 'pending',
			attemptId: 'attempt-1'
		});
		expect(result?.project.banner).toEqual({ status: 'pending', url: null });
	});

	it('only lets the owner begin an upload attempt', async () => {
		const t = createTest();

		const projectId = await t.run(async (ctx) => {
			const ownerId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			await ctx.db.insert('users', {
				authProviderId: 'workos_other',
				username: 'otheruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			return await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId: ownerId,
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		await expect(
			asUser(t, 'workos_other').mutation(api.projects.beginBannerUpload, {
				projectId,
				attemptId: 'attempt-1'
			})
		).rejects.toThrow('Not authorized');

		await expect(
			asUser(t, 'workos_owner').mutation(api.projects.beginBannerUpload, {
				projectId,
				attemptId: 'attempt-1'
			})
		).resolves.toMatchObject({ attemptId: 'attempt-1' });
	});

	it('claims and attaches a valid upload while stale failures remain no-ops', async () => {
		const t = createTest();

		const { projectId, storageId } = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				bannerUpload: { status: 'pending', attemptId: 'attempt-1', startedAt: 1000 },
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
			const storageId = await ctx.storage.store(
				new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
			);
			return { projectId, storageId };
		});
		const upload = {
			projectId,
			attemptId: 'attempt-1'
		};
		const owner = asUser(t, 'workos_owner');

		const claim = await owner.mutation(api.projects.claimBannerUpload, {
			...upload,
			storageId,
			contentType: 'image/jpeg'
		});
		expect(claim).toMatchObject({ status: 'claimed', contentType: 'image/jpeg' });
		await expect(
			owner.mutation(api.projects.finishBannerUpload, {
				...upload,
				storageId,
				outcome: 'ready'
			})
		).resolves.toEqual({ status: 'ready' });
		await expect(owner.mutation(api.projects.failBannerUpload, upload)).resolves.toEqual({
			status: 'stale'
		});

		const project = await t.run(async (ctx) => await ctx.db.get(projectId));
		expect(project?.bannerStorageId).toBe(storageId);
		expect(project?.bannerUpload).toBeUndefined();
	});

	it('rejects invalid storage and exposes failure only to the owner', async () => {
		const t = createTest();

		const { projectId, storageId } = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				bannerUpload: { status: 'pending', attemptId: 'attempt-1', startedAt: 1000 },
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
			const storageId = await ctx.storage.store(new Blob(['nope'], { type: 'text/plain' }));
			return { projectId, storageId };
		});

		await expect(
			asUser(t, 'workos_owner').mutation(api.projects.claimBannerUpload, {
				projectId,
				attemptId: 'attempt-1',
				storageId,
				contentType: 'text/plain'
			})
		).resolves.toEqual({ status: 'failed' });

		const visitorResult = await t.query(api.projectPosts.listForProject, {
			createdBy: 'owneruser',
			projectSlug: 'patchhub'
		});
		const ownerResult = await asUser(t, 'workos_owner').query(api.projectPosts.listForProject, {
			createdBy: 'owneruser',
			projectSlug: 'patchhub'
		});
		const stored = await t.run(async (ctx) => await ctx.db.system.get('_storage', storageId));

		expect(visitorResult?.project.banner).toEqual({ status: 'none', url: null });
		expect(ownerResult?.project.banner).toMatchObject({ status: 'failed' });
		expect(stored).toBeNull();
	});

	it('does not let an older attempt overwrite a retry', async () => {
		const t = createTest();

		const projectId = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			return await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
		});
		const base = { projectId };
		const owner = asUser(t, 'workos_owner');

		await owner.mutation(api.projects.beginBannerUpload, { ...base, attemptId: 'attempt-1' });
		await owner.mutation(api.projects.beginBannerUpload, { ...base, attemptId: 'attempt-2' });
		await expect(
			owner.mutation(api.projects.failBannerUpload, { ...base, attemptId: 'attempt-1' })
		).resolves.toEqual({ status: 'stale' });

		const project = await t.run(async (ctx) => await ctx.db.get(projectId));
		expect(project?.bannerUpload).toMatchObject({
			status: 'pending',
			attemptId: 'attempt-2'
		});
	});

	it('attaches a replacement before deleting the previous banner', async () => {
		const t = createTest();

		const { projectId, previousStorageId, storageId } = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const previousStorageId = await ctx.storage.store(
				new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
			);
			const storageId = await ctx.storage.store(
				new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
					type: 'image/png'
				})
			);
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				bannerStorageId: previousStorageId,
				bannerUpload: { status: 'pending', attemptId: 'attempt-1', startedAt: 1000 },
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
			return { projectId, previousStorageId, storageId };
		});
		const upload = {
			projectId,
			attemptId: 'attempt-1'
		};
		const owner = asUser(t, 'workos_owner');

		await owner.mutation(api.projects.claimBannerUpload, {
			...upload,
			storageId,
			contentType: 'image/png'
		});
		await owner.mutation(api.projects.finishBannerUpload, {
			...upload,
			storageId,
			outcome: 'ready'
		});
		const state = await t.run(async (ctx) => ({
			project: await ctx.db.get(projectId),
			previous: await ctx.db.system.get('_storage', previousStorageId),
			current: await ctx.db.system.get('_storage', storageId)
		}));

		expect(state.project?.bannerStorageId).toBe(storageId);
		expect(state.previous).toBeNull();
		expect(state.current).not.toBeNull();
	});

	it('expires only the matching pending attempt and cleans its claimed upload', async () => {
		const t = createTest();

		const { projectId, storageId } = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const storageId = await ctx.storage.store(
				new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
			);
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				bannerUpload: {
					status: 'pending',
					attemptId: 'attempt-2',
					startedAt: 1000,
					storageId
				},
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
			return { projectId, storageId };
		});

		await t.mutation(internal.projects.expireBannerUpload, {
			projectId,
			attemptId: 'attempt-1'
		});
		await t.mutation(internal.projects.expireBannerUpload, {
			projectId,
			attemptId: 'attempt-2'
		});
		const state = await t.run(async (ctx) => ({
			project: await ctx.db.get(projectId),
			storage: await ctx.db.system.get('_storage', storageId)
		}));

		expect(state.project?.bannerUpload).toMatchObject({
			status: 'failed',
			attemptId: 'attempt-2',
			errorCode: 'expired'
		});
		expect(state.storage).toBeNull();
	});
});

describe('projectPosts.create', () => {
	it('rejects posts for projects owned by another user', async () => {
		const t = createTest();

		const { projectId } = await t.run(async (ctx) => {
			const ownerId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			await ctx.db.insert('users', {
				authProviderId: 'workos_other',
				username: 'otheruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId: ownerId,
				createdAt: 1000,
				updatedAt: 1000
			});
			return { projectId };
		});

		await expect(
			asUser(t, 'workos_other').mutation(api.projectPosts.create, {
				projectId,
				kind: 'patch_notes',
				title: 'Project post',
				content: TIPTAP_DOC,
				status: 'draft'
			})
		).rejects.toThrow('Not authorized');
	});

	it('bumps the parent project updatedAt so profile ordering stays fresh', async () => {
		const t = createTest();

		const { projectId } = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
			return { projectId };
		});

		await asUser(t, 'workos_1').mutation(api.projectPosts.create, {
			projectId,
			kind: 'patch_notes',
			title: 'Project post',
			content: TIPTAP_DOC,
			status: 'published'
		});

		const project = await t.run(async (ctx) => ctx.db.get(projectId));
		expect(project?.updatedAt).toBeGreaterThan(1000);
	});

	it('rejects content without renderable text or atoms, accepts atom-only docs', async () => {
		const t = createTest();

		const { projectId } = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
			return { projectId };
		});

		const createWithContent = (content: unknown, title: string) =>
			asUser(t, 'workos_1').mutation(api.projectPosts.create, {
				projectId,
				kind: 'patch_notes',
				title,
				content: JSON.stringify(content),
				status: 'draft'
			});

		await expect(createWithContent({ type: 'doc', content: [] }, 'Empty doc')).rejects.toThrow(
			'Post content is empty'
		);
		await expect(
			createWithContent(
				{ type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph' }] },
				'Blank paragraphs'
			)
		).rejects.toThrow('Post content is empty');
		await expect(
			createWithContent(
				{
					type: 'doc',
					content: [
						{ type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
						{ type: 'paragraph' }
					]
				},
				'Whitespace only'
			)
		).rejects.toThrow('Post content is empty');
		await expect(
			createWithContent(
				{ type: 'doc', content: [{ type: 'image', attrs: { src: 'https://x.test/a.png' } }] },
				'Image only'
			)
		).resolves.toMatchObject({ slug: 'image-only' });
	});

	it('shows drafts only to the owner and returns both post kinds', async () => {
		const t = createTest();

		const { projectId } = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
			return { projectId };
		});

		const owner = asUser(t, 'workos_1');
		await owner.mutation(api.projectPosts.create, {
			projectId,
			kind: 'patch_notes',
			title: 'Draft post',
			content: TIPTAP_DOC,
			status: 'draft'
		});
		await owner.mutation(api.projectPosts.create, {
			projectId,
			kind: 'announcement',
			title: 'Published post',
			content: TIPTAP_DOC,
			status: 'published'
		});

		const publicList = await t.query(api.projectPosts.listForProject, {
			createdBy: 'owner123',
			projectSlug: 'patchhub'
		});
		expect(publicList?.project).toMatchObject({
			owner: {
				id: expect.any(String),
				name: 'owner123'
			}
		});
		expect(publicList?.posts).toHaveLength(1);
		expect(publicList?.posts[0]).toMatchObject({
			kind: 'announcement',
			title: 'Published post',
			status: 'published'
		});

		const ownerList = await owner.query(api.projectPosts.listForProject, {
			createdBy: 'owner123',
			projectSlug: 'patchhub'
		});
		expect(ownerList?.project.owner).toEqual(publicList?.project.owner);
		expect(ownerList?.posts.map((post) => post.status).sort()).toEqual(['draft', 'published']);
		expect(ownerList?.posts.map((post) => post.kind).sort()).toEqual([
			'announcement',
			'patch_notes'
		]);

		const detail = await t.query(api.projectPosts.getForProject, {
			createdBy: 'owner123',
			projectSlug: 'patchhub',
			postSlug: 'published-post'
		});
		expect(detail?.post).toMatchObject({
			kind: 'announcement',
			title: 'Published post',
			status: 'published'
		});
	});

	it('keeps older published posts visible when newer drafts exceed the list cap', async () => {
		const t = createTest();

		await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});

			await ctx.db.insert('projectPosts', {
				projectId,
				authorId: userId,
				kind: 'patch_notes',
				title: 'Published post',
				slug: 'published-post',
				content: TIPTAP_DOC,
				status: 'published',
				publishedAt: 1,
				createdAt: 1,
				updatedAt: 1
			});

			for (let index = 0; index < 120; index++) {
				await ctx.db.insert('projectPosts', {
					projectId,
					authorId: userId,
					kind: 'announcement',
					title: `Draft post ${index}`,
					slug: `draft-post-${index}`,
					content: TIPTAP_DOC,
					status: 'draft',
					createdAt: 1000 + index,
					updatedAt: 1000 + index
				});
			}
		});

		const publicList = await t.query(api.projectPosts.listForProject, {
			createdBy: 'owner123',
			projectSlug: 'patchhub'
		});

		expect(publicList?.posts).toHaveLength(1);
		expect(publicList?.posts[0]).toMatchObject({
			kind: 'patch_notes',
			title: 'Published post',
			status: 'published'
		});
	});

	it('suffixes the reserved new post slug', async () => {
		const t = createTest();

		const { projectId } = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
			return { projectId };
		});

		const post = await asUser(t, 'workos_1').mutation(api.projectPosts.create, {
			projectId,
			kind: 'patch_notes',
			title: 'New',
			content: TIPTAP_DOC,
			status: 'draft'
		});

		expect(post.slug).toBe('new-2');
	});

	it('rate limits post creation per user', async () => {
		const t = createTest();

		const projectId = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			return await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
		});
		const createPost = (title: string) =>
			asUser(t, 'workos_1').mutation(api.projectPosts.create, {
				projectId,
				kind: 'patch_notes',
				title,
				content: TIPTAP_DOC,
				status: 'draft'
			});

		for (let index = 1; index <= 5; index++) {
			await createPost(`Post ${index}`);
		}

		await expect(createPost('Post 6')).rejects.toThrow(
			'Too many new posts — please try again later.'
		);
	});
});

describe('projectPosts lifecycle mutations', () => {
	it('rejects update, setStatus, and remove for a non-owner', async () => {
		const t = createTest();

		const postId = await t.run(async (ctx) => {
			const ownerId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			await ctx.db.insert('users', {
				authProviderId: 'workos_other',
				username: 'otheruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId: ownerId,
				createdAt: 1000,
				updatedAt: 1000
			});
			return await ctx.db.insert('projectPosts', {
				projectId,
				authorId: ownerId,
				kind: 'patch_notes',
				title: 'Release 1',
				slug: 'release-1',
				content: TIPTAP_DOC,
				status: 'draft',
				createdAt: 1000,
				updatedAt: 1000
			});
		});
		const auth = { postId };
		const otherUser = asUser(t, 'workos_other');

		await expect(
			otherUser.mutation(api.projectPosts.update, {
				...auth,
				kind: 'announcement',
				title: 'Changed',
				content: TIPTAP_DOC
			})
		).rejects.toThrow('Not authorized');
		await expect(
			otherUser.mutation(api.projectPosts.setStatus, { ...auth, status: 'published' })
		).rejects.toThrow('Not authorized');
		await expect(otherUser.mutation(api.projectPosts.remove, auth)).rejects.toThrow(
			'Not authorized'
		);
	});

	it('updates post content while preserving the slug', async () => {
		const t = createTest();
		const updatedContent = JSON.stringify({
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New content.' }] }]
		});

		const postId = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
			return await ctx.db.insert('projectPosts', {
				projectId,
				authorId: userId,
				kind: 'patch_notes',
				title: 'Release 1',
				slug: 'stable-permalink',
				content: TIPTAP_DOC,
				status: 'published',
				publishedAt: 1000,
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		await expect(
			asUser(t, 'workos_owner').mutation(api.projectPosts.update, {
				postId,
				kind: 'announcement',
				title: '  Renamed release  ',
				content: updatedContent
			})
		).resolves.toEqual({ slug: 'stable-permalink' });

		const post = await t.run(async (ctx) => await ctx.db.get(postId));
		expect(post).toMatchObject({
			kind: 'announcement',
			title: 'Renamed release',
			slug: 'stable-permalink',
			content: updatedContent
		});
	});

	it('sets publishedAt on publish and clears it on unpublish', async () => {
		const t = createTest();

		const postId = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			const projectId = await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
			return await ctx.db.insert('projectPosts', {
				projectId,
				authorId: userId,
				kind: 'patch_notes',
				title: 'Release 1',
				slug: 'release-1',
				content: TIPTAP_DOC,
				status: 'draft',
				createdAt: 1000,
				updatedAt: 1000
			});
		});
		const auth = { postId };
		const owner = asUser(t, 'workos_owner');

		const published = await owner.mutation(api.projectPosts.setStatus, {
			...auth,
			status: 'published'
		});
		expect(published).toMatchObject({
			slug: 'release-1',
			status: 'published',
			publishedAt: expect.any(Number)
		});
		expect((await t.run(async (ctx) => await ctx.db.get(postId)))?.publishedAt).toBe(
			published.publishedAt
		);
		await expect(
			owner.mutation(api.projectPosts.setStatus, { ...auth, status: 'published' })
		).resolves.toEqual(published);

		await expect(
			owner.mutation(api.projectPosts.setStatus, { ...auth, status: 'draft' })
		).resolves.toEqual({ slug: 'release-1', status: 'draft', publishedAt: null });
		const unpublished = await t.run(async (ctx) => await ctx.db.get(postId));
		expect(unpublished?.status).toBe('draft');
		expect(unpublished?.publishedAt).toBeUndefined();
	});

	it('removes a post from public queries and keeps its slug reserved', async () => {
		const t = createTest();

		const projectId = await t.run(async (ctx) => {
			const userId = await ctx.db.insert('users', {
				authProviderId: 'workos_owner',
				username: 'owneruser',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
			return await ctx.db.insert('projects', {
				name: 'PatchHub',
				normalizedName: 'PATCHHUB',
				slug: 'patchhub',
				userId,
				createdAt: 1000,
				updatedAt: 1000
			});
		});
		const createArgs = {
			projectId,
			kind: 'patch_notes' as const,
			title: 'Release 1',
			content: TIPTAP_DOC,
			status: 'published' as const
		};
		const owner = asUser(t, 'workos_owner');
		const post = await owner.mutation(api.projectPosts.create, createArgs);

		await expect(
			owner.mutation(api.projectPosts.remove, {
				postId: post.id
			})
		).resolves.toBeNull();

		const publicList = await t.query(api.projectPosts.listForProject, {
			createdBy: 'owneruser',
			projectSlug: 'patchhub'
		});
		const publicDetail = await t.query(api.projectPosts.getForProject, {
			createdBy: 'owneruser',
			projectSlug: 'patchhub',
			postSlug: post.slug
		});
		expect(publicList?.posts).toHaveLength(0);
		expect(publicDetail).toBeNull();

		await expect(owner.mutation(api.projectPosts.create, createArgs)).resolves.toMatchObject({
			slug: `${post.slug}-2`
		});
		await expect(
			t.query(api.projectPosts.getForProject, {
				createdBy: 'owneruser',
				projectSlug: 'patchhub',
				postSlug: post.slug
			})
		).resolves.toBeNull();
	});
});
