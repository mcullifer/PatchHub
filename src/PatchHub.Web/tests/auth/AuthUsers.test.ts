import * as schema from '$lib/server/db/schema';
import {
	createOrGetUserForWorkOSUser,
	findActiveUserByAuthProviderId,
	findUserByAuthProviderId,
	type AuthDatabase
} from '$lib/server/auth/users';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

describe('auth users', () => {
	const databases: Database.Database[] = [];

	afterEach(() => {
		for (const sqlite of databases.splice(0)) {
			sqlite.close();
		}
	});

	it('normalizes username before insert and duplicate checks', async () => {
		const database = createTestDatabase(databases);
		const now = new Date('2026-06-16T00:00:00.000Z');

		const createdUser = await createOrGetUserForWorkOSUser(
			'user_1',
			'user1@example.com',
			'  PatchHub42  ',
			now,
			now,
			database
		);

		expect(createdUser.username).toBe('patchhub42');
		await expect(
			createOrGetUserForWorkOSUser('user_2', 'user2@example.com', 'PATCHHUB42', now, now, database)
		).rejects.toThrow('Username is already taken');
	});

	it('distinguishes active users from soft-deleted users', async () => {
		const database = createTestDatabase(databases);
		const now = new Date('2026-06-16T00:00:00.000Z');

		await database.insert(schema.user).values([
			{
				authProviderId: 'active_user',
				username: 'activeuser',
				email: 'active@example.com',
				createdAt: now,
				updatedAt: now
			},
			{
				authProviderId: 'deleted_user',
				username: 'deleteduser',
				email: 'deleted@example.com',
				createdAt: now,
				updatedAt: now,
				deletedAt: now
			}
		]);

		await expect(findUserByAuthProviderId('deleted_user', database)).resolves.toMatchObject({
			authProviderId: 'deleted_user'
		});
		await expect(findActiveUserByAuthProviderId('active_user', database)).resolves.toMatchObject({
			authProviderId: 'active_user'
		});
		await expect(findActiveUserByAuthProviderId('deleted_user', database)).resolves.toBeNull();
	});
});

function createTestDatabase(openDatabases: Database.Database[]): AuthDatabase {
	const sqlite = new Database(':memory:');
	openDatabases.push(sqlite);
	sqlite.exec(`
		create table user (
			id integer primary key autoincrement,
			auth_provider_id text not null unique,
			username text unique,
			email text,
			created_at integer not null,
			updated_at integer not null,
			deleted_at integer
		);
	`);

	return drizzle(sqlite, { schema }) as AuthDatabase;
}
