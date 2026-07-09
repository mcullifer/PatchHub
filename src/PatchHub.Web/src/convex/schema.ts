import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Timestamps are Unix epoch milliseconds. Soft deletes use optional deletedAt.
export default defineSchema({
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
		.index('by_type_and_slug', ['type', 'slug'])
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
		userId: v.optional(v.id('users')),
		orgId: v.optional(v.id('organizations')),
		createdAt: v.number(),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_slug', ['slug'])
		.index('by_userId', ['userId'])
		.index('by_userId_and_slug', ['userId', 'slug'])
		.index('by_orgId', ['orgId'])
		.index('by_orgId_and_slug', ['orgId', 'slug']),

	patchNotes: defineTable({
		projectId: v.id('projects'),
		authorId: v.id('users'),
		title: v.string(),
		slug: v.string(),
		content: v.string(), // WYSIWYG HTML
		status: v.string(), // 'draft' | 'published' | 'archived'
		publishedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_projectId_and_slug', ['projectId', 'slug'])
		.index('by_status', ['status']),

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
