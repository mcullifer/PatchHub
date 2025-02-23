import { sql, type SQL } from 'drizzle-orm';
import { integer, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// Might want to rename this to items or something more generic
// then add a type column that can be 'game' or 'software' or other
export const catalog = sqliteTable('catalog', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	normalizedName: text('normalized_name').notNull(),
	type: text('type').notNull(),
	createdBy: text('created_by').notNull(), // External source, user, organization, etc.
	externalId: text('external_id')
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

export type Catalog = typeof catalog.$inferSelect;

// custom lower function
export function lower(email: AnySQLiteColumn): SQL {
	return sql`(lower(${email}))`;
}
