import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { user, type User } from '../db/schema';
import { normalizeUsername, validateUsername } from './usernames';

export type AuthDatabase = typeof db;

export async function findUserByAuthProviderId(
	authProviderId: string,
	database: AuthDatabase = db
): Promise<User | null> {
	const result = await database.select().from(user).where(eq(user.authProviderId, authProviderId));
	return result[0] ?? null;
}

export async function findActiveUserByAuthProviderId(
	authProviderId: string,
	database: AuthDatabase = db
): Promise<User | null> {
	const result = await database
		.select()
		.from(user)
		.where(and(eq(user.authProviderId, authProviderId), isNull(user.deletedAt)));

	return result[0] ?? null;
}

export async function findUserByUsername(
	username: string,
	database: AuthDatabase = db
): Promise<User | null> {
	const normalizedUsername = normalizeUsername(username);
	const result = await database
		.select()
		.from(user)
		.where(sql`lower(${user.username}) = ${normalizedUsername}`);

	return result[0] ?? null;
}

export async function createOrGetUserForWorkOSUser(
	authProviderId: string,
	email: string | null,
	username: string,
	createdAt: Date,
	updatedAt: Date,
	database: AuthDatabase = db
): Promise<User> {
	const existingUser = await findUserByAuthProviderId(authProviderId, database);
	if (existingUser) {
		if (existingUser.deletedAt) {
			throw new Error('Account is disabled');
		}

		return existingUser;
	}

	const usernameValidation = validateUsername(username);
	if (!usernameValidation.ok) {
		throw new Error(usernameValidation.message);
	}

	const existingUsername = await findUserByUsername(usernameValidation.username, database);
	if (existingUsername) {
		throw new Error('Username is already taken');
	}

	await database
		.insert(user)
		.values({
			authProviderId,
			email,
			username: usernameValidation.username,
			createdAt,
			updatedAt
		})
		.onConflictDoNothing({ target: user.authProviderId });

	const dbUser = await findActiveUserByAuthProviderId(authProviderId, database);
	if (!dbUser) {
		throw new Error('Unable to create user');
	}

	return dbUser;
}
