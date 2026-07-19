import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const projectPostKind = v.union(v.literal('patch_notes'), v.literal('announcement'));

// Timestamps are Unix epoch milliseconds. Soft deletes use optional deletedAt.
export default defineSchema({
	cacheEntries: defineTable({
		key: v.string(),
		value: v.optional(v.string()),
		expiresAt: v.number(),
		updatedAt: v.number(),
		refetchClaimedAt: v.optional(v.number())
	}).index('by_key', ['key']),

	users: defineTable({
		authProviderId: v.string(),
		// Stored normalized (trimmed, lowercase)
		username: v.optional(v.string()),
		email: v.optional(v.string()),
		platformRole: v.union(v.literal('member'), v.literal('admin')),
		createdAt: v.number(),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_authProviderId', ['authProviderId'])
		.index('by_username', ['username']),

	organizations: defineTable({
		authProviderId: v.string(),
		name: v.string(),
		slug: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_authProviderId', ['authProviderId'])
		.index('by_slug', ['slug']),

	// Search index catalog for Steam games and other external sources
	externalItems: defineTable({
		name: v.string(),
		normalizedName: v.string(),
		type: v.string(), // 'steam', 'software', etc.
		externalId: v.optional(v.string()), // e.g., Steam app ID
		source: v.optional(v.string()),
		appType: v.string(),
		slug: v.string(),
		searchName: v.string(), // normalized, space-separated, lowercase
		metadataJson: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_type_and_externalId', ['type', 'externalId'])
		.searchIndex('search_searchName', {
			searchField: 'searchName',
			filterFields: ['type']
		}),

	// Singleton row tracking steam catalog sync progress
	steamCatalogSyncState: defineTable({
		key: v.literal('singleton'),
		lastAppId: v.optional(v.string()),
		status: v.string(), // 'idle' | 'running' | 'partial' | 'complete' | 'failed'
		lastError: v.optional(v.string()),
		updatedAt: v.number()
	}).index('by_key', ['key']),

	projects: defineTable({
		name: v.string(),
		normalizedName: v.string(),
		slug: v.string(),
		description: v.optional(v.string()),
		bannerStorageId: v.optional(v.id('_storage')),
		bannerUpload: v.optional(
			v.union(
				v.object({
					status: v.literal('pending'),
					attemptId: v.string(),
					startedAt: v.number(),
					storageId: v.optional(v.id('_storage')),
					contentType: v.optional(v.string())
				}),
				v.object({
					status: v.literal('failed'),
					attemptId: v.string(),
					failedAt: v.number(),
					errorCode: v.union(
						v.literal('upload_failed'),
						v.literal('invalid_file'),
						v.literal('expired')
					)
				})
			)
		),
		userId: v.optional(v.id('users')),
		orgId: v.optional(v.id('organizations')),
		createdAt: v.number(),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_userId_and_deletedAt_and_updatedAt', ['userId', 'deletedAt', 'updatedAt'])
		.index('by_userId_and_slug_and_deletedAt', ['userId', 'slug', 'deletedAt'])
		.index('by_orgId_and_deletedAt_and_updatedAt', ['orgId', 'deletedAt', 'updatedAt'])
		.index('by_orgId_and_slug_and_deletedAt', ['orgId', 'slug', 'deletedAt'])
		.index('by_bannerStorageId', ['bannerStorageId']),

	projectPosts: defineTable({
		projectId: v.id('projects'),
		authorId: v.id('users'),
		kind: projectPostKind,
		title: v.string(),
		slug: v.string(),
		content: v.string(), // Stringified TipTap JSON document, not rendered HTML
		status: v.union(v.literal('draft'), v.literal('published'), v.literal('archived')),
		publishedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_projectId_and_deletedAt_and_status_and_createdAt', [
			'projectId',
			'deletedAt',
			'status',
			'createdAt'
		])
		.index('by_projectId_and_deletedAt_and_status_and_publishedAt', [
			'projectId',
			'deletedAt',
			'status',
			'publishedAt'
		])
		.index('by_projectId_and_slug_and_deletedAt', ['projectId', 'slug', 'deletedAt']),

	projectFavorites: defineTable({
		userId: v.id('users'),
		projectId: v.id('projects')
	})
		.index('by_userId', ['userId'])
		.index('by_userId_and_projectId', ['userId', 'projectId']),

	externalItemFavorites: defineTable({
		userId: v.id('users'),
		externalItemId: v.id('externalItems')
	})
		.index('by_userId', ['userId'])
		.index('by_userId_and_externalItemId', ['userId', 'externalItemId'])
});
