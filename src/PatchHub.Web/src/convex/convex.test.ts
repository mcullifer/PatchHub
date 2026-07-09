// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, internal } from './_generated/api';
import { fetchSteamAppListPage } from './lib/steam';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const SECRET = 'test-secret';

function createTest() {
	return convexTest(schema, modules);
}

beforeEach(() => {
	vi.stubEnv('SERVER_SECRET', SECRET);
});

describe('users.getOrCreate', () => {
	it('creates a user with a normalized username and returns it on repeat calls', async () => {
		const t = createTest();

		const created = await t.mutation(api.users.getOrCreate, {
			secret: SECRET,
			authProviderId: 'workos_1',
			email: 'max@example.com',
			username: '  MaxUser1  ',
			createdAt: 1000,
			updatedAt: 2000
		});

		expect(created.username).toBe('maxuser1');
		expect(created.authProviderId).toBe('workos_1');
		expect(created.platformRole).toBe('member');

		const again = await t.mutation(api.users.getOrCreate, {
			secret: SECRET,
			authProviderId: 'workos_1',
			username: 'different',
			createdAt: 3000,
			updatedAt: 4000
		});
		expect(again._id).toBe(created._id);
	});

	it('rejects a username that is already taken', async () => {
		const t = createTest();

		await t.mutation(api.users.getOrCreate, {
			secret: SECRET,
			authProviderId: 'workos_1',
			username: 'maxuser1',
			createdAt: 1000,
			updatedAt: 1000
		});

		await expect(
			t.mutation(api.users.getOrCreate, {
				secret: SECRET,
				authProviderId: 'workos_2',
				username: 'MAXUSER1',
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
				username: 'maxuser1',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000,
				deletedAt: 2000
			});
		});

		await expect(
			t.mutation(api.users.getOrCreate, {
				secret: SECRET,
				authProviderId: 'workos_1',
				username: 'maxuser1',
				createdAt: 1000,
				updatedAt: 1000
			})
		).rejects.toThrow('Account is disabled');
	});

	it('rejects calls without the server secret', async () => {
		const t = createTest();

		await expect(
			t.mutation(api.users.getOrCreate, {
				secret: 'wrong',
				authProviderId: 'workos_1',
				username: 'maxuser1',
				createdAt: 1000,
				updatedAt: 1000
			})
		).rejects.toThrow('Unauthorized');
	});
});

describe('favorites', () => {
	it('adds, lists, and removes external item favorites idempotently', async () => {
		const t = createTest();

		const { itemId } = await t.run(async (ctx) => {
			await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'maxuser1',
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

		await t.mutation(api.favorites.addExternalItem, {
			secret: SECRET,
			authProviderId: 'workos_1',
			externalItemId: itemId
		});
		// Second add is a no-op, not an error
		await t.mutation(api.favorites.addExternalItem, {
			secret: SECRET,
			authProviderId: 'workos_1',
			externalItemId: itemId
		});

		const favorites = await t.query(api.favorites.getForUser, {
			secret: SECRET,
			authProviderId: 'workos_1'
		});
		expect(favorites.externalItems).toHaveLength(1);
		expect(favorites.externalItems[0]).toMatchObject({
			id: itemId,
			name: 'Counter-Strike',
			externalId: '10'
		});

		await t.mutation(api.favorites.removeExternalItem, {
			secret: SECRET,
			authProviderId: 'workos_1',
			externalItemId: itemId
		});
		const afterRemove = await t.query(api.favorites.getForUser, {
			secret: SECRET,
			authProviderId: 'workos_1'
		});
		expect(afterRemove.externalItems).toHaveLength(0);
	});

	it('uses the Convex auth identity for client-side favorite mutations', async () => {
		const t = createTest();

		const { itemId } = await t.run(async (ctx) => {
			await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'maxuser1',
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

		const favorites = await currentUser.query(api.favorites.getForUser, {});
		expect(favorites.externalItems).toHaveLength(1);
		expect(favorites.externalItems[0]).toMatchObject({ id: itemId });

		const otherUser = t.withIdentity({ subject: 'workos_2' });
		const otherFavorites = await otherUser.query(api.favorites.getForUser, {});
		expect(otherFavorites.externalItems).toHaveLength(0);

		await currentUser.mutation(api.favorites.removeExternalItem, { externalItemId: itemId });
		const afterRemove = await currentUser.query(api.favorites.getForUser, {});
		expect(afterRemove.externalItems).toHaveLength(0);
	});

	it('rejects client-side favorite mutations without authenticated identity', async () => {
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

		await expect(
			t.mutation(api.favorites.addExternalItem, {
				authProviderId: 'workos_1',
				externalItemId: itemId
			})
		).rejects.toThrow('Unauthorized');
	});

	it('returns empty favorites for unknown users', async () => {
		const t = createTest();

		const favorites = await t.query(api.favorites.getForUser, {
			secret: SECRET,
			authProviderId: 'nobody'
		});
		expect(favorites).toEqual({ externalItems: [], projects: [] });
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

	it('preserves the prior cursor when marking a sync failed', async () => {
		const t = createTest();

		await t.mutation(internal.steamSync.markStarted, { cursor: 10 });
		await t.mutation(internal.steamSync.markFailed, { message: 'Steam API unavailable' });

		const syncState = await t.run(async (ctx) => {
			return await ctx.db
				.query('steamCatalogSyncState')
				.withIndex('by_key', (q) => q.eq('key', 'singleton'))
				.unique();
		});

		expect(syncState).toMatchObject({
			lastAppId: '10',
			status: 'failed',
			lastError: 'Steam API unavailable'
		});
	});

	it('rejects invalid run options before marking the sync running', async () => {
		const t = createTest();

		await t.mutation(internal.steamSync.setFinished, { cursor: 10, status: 'complete' });

		await expect(
			t.action(api.steamSync.runManual, {
				secret: SECRET,
				maxPages: 0
			})
		).rejects.toThrow('Steam sync maxPages must be a positive integer');

		const syncState = await t.run(async (ctx) => {
			return await ctx.db
				.query('steamCatalogSyncState')
				.withIndex('by_key', (q) => q.eq('key', 'singleton'))
				.unique();
		});

		expect(syncState).toMatchObject({
			lastAppId: '10',
			status: 'complete'
		});
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

	it('rejects malformed app rows', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {
						apps: [{ appid: '25', name: 'Cursor Game' }]
					}
				})
			);

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
		expect(names).toEqual({ '10': { name: 'Counter-Strike', slug: 'counter-strike' } });
	});
});

describe('projects.getByOwnerAndSlug', () => {
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
				username: 'maxuser1',
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

		const project = await t.query(api.projects.getByOwnerAndSlug, {
			createdBy: 'maxuser1',
			projectSlug: 'patchhub'
		});

		expect(project).toMatchObject({
			name: 'PatchHub',
			slug: 'patchhub'
		});
	});
});
