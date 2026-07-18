// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
			email: 'owner@example.com',
			username: '  Owner123  ',
			createdAt: 1000,
			updatedAt: 2000
		});

		expect(created.username).toBe('owner123');
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
			username: 'owner123',
			createdAt: 1000,
			updatedAt: 1000
		});

		await expect(
			t.mutation(api.users.getOrCreate, {
				secret: SECRET,
				authProviderId: 'workos_2',
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
			t.mutation(api.users.getOrCreate, {
				secret: SECRET,
				authProviderId: 'workos_1',
				username: 'owner123',
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
				username: 'owner123',
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

		const project = await t.query(api.projects.getByOwnerAndSlug, {
			createdBy: 'owner123',
			projectSlug: 'patchhub'
		});

		expect(project).toMatchObject({
			name: 'PatchHub',
			slug: 'patchhub'
		});
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
			createdBy: 'owner123'
		});

		expect(profile?.owner).toMatchObject({
			kind: 'user',
			name: 'owner123'
		});
		expect(profile?.owner).not.toHaveProperty('authProviderId');
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

	it('returns auth provider details only from the server owner profile query', async () => {
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

		const publicProfile = await t.query(api.projects.getOwnerProfile, {
			createdBy: 'owner123'
		});
		const serverProfile = await t.query(api.projects.getOwnerProfileForServer, {
			secret: SECRET,
			createdBy: 'owner123'
		});

		expect(publicProfile?.owner).not.toHaveProperty('authProviderId');
		expect(serverProfile?.owner).toMatchObject({
			kind: 'user',
			name: 'owner123',
			authProviderId: 'workos_1'
		});
	});
});

describe('projects.create', () => {
	it('creates unique slugs for repeated project names owned by the same user', async () => {
		const t = createTest();

		await t.run(async (ctx) => {
			await ctx.db.insert('users', {
				authProviderId: 'workos_1',
				username: 'owner123',
				platformRole: 'member',
				createdAt: 1000,
				updatedAt: 1000
			});
		});

		const firstProject = await t.mutation(api.projects.create, {
			secret: SECRET,
			authProviderId: 'workos_1',
			name: '  PatchHub  ',
			description: '  Release notes in one place  '
		});
		const secondProject = await t.mutation(api.projects.create, {
			secret: SECRET,
			authProviderId: 'workos_1',
			name: 'PatchHub'
		});

		expect(firstProject).toMatchObject({
			name: 'PatchHub',
			slug: 'patchhub'
		});
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
			t.mutation(api.projects.create, {
				secret: SECRET,
				authProviderId: 'workos_1',
				name: '   '
			})
		).rejects.toThrow('Project name is required');

		await expect(
			t.mutation(api.projects.create, {
				secret: SECRET,
				authProviderId: 'workos_1',
				name: 'PatchHub',
				description: 'x'.repeat(501)
			})
		).rejects.toThrow('Project description must be at most 500 characters');
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

		const result = await t.query(api.projectPosts.listByOwnerAndProject, {
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

		const created = await t.mutation(api.projects.create, {
			secret: SECRET,
			authProviderId: 'workos_owner',
			name: 'PatchHub',
			bannerUploadAttemptId: 'attempt-1'
		});
		const project = await t.run(async (ctx) => await ctx.db.get(created.id));
		const result = await t.query(api.projectPosts.listByOwnerAndProject, {
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
			t.mutation(api.projects.beginBannerUpload, {
				secret: SECRET,
				authProviderId: 'workos_other',
				projectId,
				attemptId: 'attempt-1'
			})
		).rejects.toThrow('Not authorized');

		await expect(
			t.mutation(api.projects.beginBannerUpload, {
				secret: SECRET,
				authProviderId: 'workos_owner',
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
		const auth = {
			secret: SECRET,
			authProviderId: 'workos_owner',
			projectId,
			attemptId: 'attempt-1'
		};

		const claim = await t.mutation(api.projects.claimBannerUpload, {
			...auth,
			storageId,
			contentType: 'image/jpeg'
		});
		expect(claim).toMatchObject({ status: 'claimed', contentType: 'image/jpeg' });
		await expect(
			t.mutation(api.projects.finishBannerUpload, {
				...auth,
				storageId,
				outcome: 'ready'
			})
		).resolves.toEqual({ status: 'ready' });
		await expect(t.mutation(api.projects.failBannerUpload, auth)).resolves.toEqual({
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
			t.mutation(api.projects.claimBannerUpload, {
				secret: SECRET,
				authProviderId: 'workos_owner',
				projectId,
				attemptId: 'attempt-1',
				storageId,
				contentType: 'text/plain'
			})
		).resolves.toEqual({ status: 'failed' });

		const visitorResult = await t.query(api.projectPosts.listByOwnerAndProject, {
			createdBy: 'owneruser',
			projectSlug: 'patchhub'
		});
		const ownerResult = await t.query(api.projectPosts.listByOwnerAndProject, {
			createdBy: 'owneruser',
			projectSlug: 'patchhub',
			secret: SECRET,
			authProviderId: 'workos_owner'
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
		const base = {
			secret: SECRET,
			authProviderId: 'workos_owner',
			projectId
		};

		await t.mutation(api.projects.beginBannerUpload, { ...base, attemptId: 'attempt-1' });
		await t.mutation(api.projects.beginBannerUpload, { ...base, attemptId: 'attempt-2' });
		await expect(
			t.mutation(api.projects.failBannerUpload, { ...base, attemptId: 'attempt-1' })
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
		const auth = {
			secret: SECRET,
			authProviderId: 'workos_owner',
			projectId,
			attemptId: 'attempt-1'
		};

		await t.mutation(api.projects.claimBannerUpload, {
			...auth,
			storageId,
			contentType: 'image/png'
		});
		await t.mutation(api.projects.finishBannerUpload, {
			...auth,
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
			t.mutation(api.projectPosts.create, {
				secret: SECRET,
				authProviderId: 'workos_other',
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

		await t.mutation(api.projectPosts.create, {
			secret: SECRET,
			authProviderId: 'workos_1',
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
			t.mutation(api.projectPosts.create, {
				secret: SECRET,
				authProviderId: 'workos_1',
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

		await t.mutation(api.projectPosts.create, {
			secret: SECRET,
			authProviderId: 'workos_1',
			projectId,
			kind: 'patch_notes',
			title: 'Draft post',
			content: TIPTAP_DOC,
			status: 'draft'
		});
		await t.mutation(api.projectPosts.create, {
			secret: SECRET,
			authProviderId: 'workos_1',
			projectId,
			kind: 'announcement',
			title: 'Published post',
			content: TIPTAP_DOC,
			status: 'published'
		});

		const publicList = await t.query(api.projectPosts.listByOwnerAndProject, {
			createdBy: 'owner123',
			projectSlug: 'patchhub'
		});
		expect(publicList?.project).toMatchObject({
			ownerName: 'owner123',
			ownerKind: 'user',
			isOwner: false
		});
		expect(publicList?.posts).toHaveLength(1);
		expect(publicList?.posts[0]).toMatchObject({
			kind: 'announcement',
			title: 'Published post',
			status: 'published'
		});

		const ownerList = await t.query(api.projectPosts.listByOwnerAndProject, {
			createdBy: 'owner123',
			projectSlug: 'patchhub',
			secret: SECRET,
			authProviderId: 'workos_1'
		});
		expect(ownerList?.project.isOwner).toBe(true);
		expect(ownerList?.posts.map((post) => post.status).sort()).toEqual(['draft', 'published']);
		expect(ownerList?.posts.map((post) => post.kind).sort()).toEqual([
			'announcement',
			'patch_notes'
		]);

		const detail = await t.query(api.projectPosts.getByOwnerProjectAndSlug, {
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

		const publicList = await t.query(api.projectPosts.listByOwnerAndProject, {
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

		const post = await t.mutation(api.projectPosts.create, {
			secret: SECRET,
			authProviderId: 'workos_1',
			projectId,
			kind: 'patch_notes',
			title: 'New',
			content: TIPTAP_DOC,
			status: 'draft'
		});

		expect(post.slug).toBe('new-2');
	});
});
