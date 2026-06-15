import { sql, type SQL } from 'drizzle-orm';
import {
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
		metadataJson: text('metadata_json'),
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

export const steamCatalogSyncState = sqliteTable('steam_catalog_sync_state', {
	id: integer('id').primaryKey(),
	lastAppId: text('last_app_id'),
	status: text('status').notNull().default('idle'),
	lastError: text('last_error'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// Project table - user or org created projects
export const project = sqliteTable('project', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	normalizedName: text('normalized_name').notNull(),
	slug: text('slug').notNull(),
	description: text('description'),
	userId: integer('user_id'),
	orgId: integer('org_id'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	deletedAt: integer('deleted_at', { mode: 'timestamp' })
});

// Patch note table - individual patch note entries
export const patchNote = sqliteTable(
	'patchnote',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		projectId: integer('project_id').notNull(),
		authorId: integer('author_id').notNull(),
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
		userId: integer('user_id').notNull(),
		projectId: integer('project_id').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [unique().on(table.userId, table.projectId)]
);

// External item favorite table - users favoriting external items (e.g., Steam games)
export const externalItemFavorite = sqliteTable(
	'external_item_favorite',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id').notNull(),
		externalItemId: integer('external_item_id').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [unique().on(table.userId, table.externalItemId)]
);

// Type exports
export type User = typeof user.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type ExternalItem = typeof externalItem.$inferSelect;
export type SteamCatalogSyncState = typeof steamCatalogSyncState.$inferSelect;
export type Project = typeof project.$inferSelect;
export type PatchNote = typeof patchNote.$inferSelect;
export type ProjectFavorite = typeof projectFavorite.$inferSelect;
export type ExternalItemFavorite = typeof externalItemFavorite.$inferSelect;

// Custom lower function
export function lower(email: AnySQLiteColumn): SQL {
	return sql`(lower(${email}))`;
}
