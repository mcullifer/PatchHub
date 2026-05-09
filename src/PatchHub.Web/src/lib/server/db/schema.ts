import { sql, type SQL } from 'drizzle-orm';
import {
	check,
	integer,
	sqliteTable,
	text,
	unique,
	uniqueIndex,
	type AnySQLiteColumn
} from 'drizzle-orm/sqlite-core';

// User table - simplified for WorkOS authentication
export const user = sqliteTable('user', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	authProviderId: text('auth_provider_id').notNull().unique(),
	username: text('username').unique(),
	email: text('email'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	deletedAt: integer('deleted_at', { mode: 'timestamp' })
});

// Organization table - synced from WorkOS
export const organization = sqliteTable('organization', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	authProviderId: text('auth_provider_id').notNull().unique(),
	name: text('name').notNull(),
	slug: text('slug').unique(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	deletedAt: integer('deleted_at', { mode: 'timestamp' })
});

// External items table - for Steam games and other external sources (search index only)
export const externalItem = sqliteTable(
	'external_item',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		normalizedName: text('normalized_name').notNull(),
		type: text('type').notNull(), // 'steam', 'windows', 'nvidia', etc.
		externalId: text('external_id'), // e.g., Steam app ID
		source: text('source'), // Additional metadata about source
		appType: text('app_type').notNull().default('unknown'),
		slug: text('slug').notNull().default(''),
		searchName: text('search_name').notNull().default(''),
		isSearchable: integer('is_searchable', { mode: 'boolean' }).notNull().default(false),
		trackStatus: text('track_status').notNull().default('candidate'),
		lastNewsCheckedAt: integer('last_news_checked_at', { mode: 'timestamp' }),
		lastNewsItemAt: integer('last_news_item_at', { mode: 'timestamp' }),
		metadataJson: text('metadata_json'),
		firstSeenAt: integer('first_seen_at', { mode: 'timestamp' }),
		lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
		lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [
		// Performance indexes for search
		uniqueIndex('external_item_source_external_id_idx').on(table.type, table.externalId),
		uniqueIndex('external_item_source_slug_external_id_idx').on(
			table.type,
			table.slug,
			table.externalId
		)
	]
);

export const externalSyncState = sqliteTable(
	'external_sync_state',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		source: text('source').notNull(),
		syncKind: text('sync_kind').notNull(),
		cursor: text('cursor'),
		status: text('status').notNull().default('idle'),
		startedAt: integer('started_at', { mode: 'timestamp' }),
		finishedAt: integer('finished_at', { mode: 'timestamp' }),
		lastError: text('last_error'),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [uniqueIndex('external_sync_state_source_kind_idx').on(table.source, table.syncKind)]
);

// Project table - user or org created projects
export const project = sqliteTable(
	'project',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		normalizedName: text('normalized_name').notNull(),
		slug: text('slug').notNull(),
		description: text('description'),
		userId: integer('user_id').references(() => user.id),
		orgId: integer('org_id').references(() => organization.id),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
		deletedAt: integer('deleted_at', { mode: 'timestamp' })
	},
	(table) => [
		// Ensure exactly one of userId or orgId is set
		check(
			'project_owner_check',
			sql`(
		CASE WHEN ${table.userId} IS NOT NULL THEN 1 ELSE 0 END +
		CASE WHEN ${table.orgId} IS NOT NULL THEN 1 ELSE 0 END
	) = 1`
		),
		// Partial unique indexes for slug uniqueness per owner
		uniqueIndex('project_user_slug_idx')
			.on(table.userId, table.slug)
			.where(sql`${table.userId} IS NOT NULL`),
		uniqueIndex('project_org_slug_idx')
			.on(table.orgId, table.slug)
			.where(sql`${table.orgId} IS NOT NULL`)
	]
);

// Patch note table - individual patch note entries
export const patchNote = sqliteTable(
	'patchnote',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		projectId: integer('project_id')
			.notNull()
			.references(() => project.id),
		authorId: integer('author_id')
			.notNull()
			.references(() => user.id),
		title: text('title').notNull(),
		slug: text('slug').notNull(),
		content: text('content').notNull(), // WYSIWYG HTML
		status: text('status').notNull().default('draft'), // 'draft', 'published', 'archived'
		publishedAt: integer('published_at', { mode: 'timestamp' }),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
		deletedAt: integer('deleted_at', { mode: 'timestamp' })
	},
	(table) => [
		// Status validation
		check('patchnote_status_check', sql`${table.status} IN ('draft', 'published', 'archived')`),
		// Performance indexes
		uniqueIndex('patchnote_project_slug_idx').on(table.projectId, table.slug),
		uniqueIndex('patchnote_status_idx').on(table.status),
		uniqueIndex('patchnote_published_at_idx').on(table.publishedAt)
	]
);

// Project favorite table - users favoriting projects
export const projectFavorite = sqliteTable(
	'project_favorite',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id),
		projectId: integer('project_id')
			.notNull()
			.references(() => project.id),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [unique().on(table.userId, table.projectId)]
);

// External item favorite table - users favoriting external items (e.g., Steam games)
export const externalItemFavorite = sqliteTable(
	'external_item_favorite',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id),
		externalItemId: integer('external_item_id')
			.notNull()
			.references(() => externalItem.id),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [unique().on(table.userId, table.externalItemId)]
);

// Type exports
export type User = typeof user.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type ExternalItem = typeof externalItem.$inferSelect;
export type ExternalSyncState = typeof externalSyncState.$inferSelect;
export type Project = typeof project.$inferSelect;
export type PatchNote = typeof patchNote.$inferSelect;
export type ProjectFavorite = typeof projectFavorite.$inferSelect;
export type ExternalItemFavorite = typeof externalItemFavorite.$inferSelect;

// Custom lower function
export function lower(email: AnySQLiteColumn): SQL {
	return sql`(lower(${email}))`;
}
