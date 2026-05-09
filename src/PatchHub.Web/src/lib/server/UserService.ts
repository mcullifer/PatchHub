import { eq } from 'drizzle-orm';
import { db } from './db';
import { user, type User } from './db/schema';

export async function findUserByAuthProviderId(authProviderId: string): Promise<User | null> {
	const result = await db.select().from(user).where(eq(user.authProviderId, authProviderId));
	return result[0] ?? null;
}

export async function findUserByUsername(username: string): Promise<User | null> {
	const result = await db.select().from(user).where(eq(user.username, username));
	return result[0] ?? null;
}

export async function createUser(
	authProviderId: string,
	email: string | null,
	username: string | null,
	createdAt: Date,
	updatedAt: Date
): Promise<User> {
	const result = await db
		.insert(user)
		.values({
			authProviderId,
			email,
			username,
			createdAt,
			updatedAt
		})
		.returning();

	return result[0];
}

export async function createOrGetUserForWorkOSUser(
	authProviderId: string,
	email: string | null,
	username: string,
	createdAt: Date,
	updatedAt: Date
): Promise<User> {
	const existingUser = await findUserByAuthProviderId(authProviderId);
	if (existingUser) return existingUser;

	const existingUsername = await findUserByUsername(username);
	if (existingUsername) {
		throw new Error('Username is already taken');
	}

	await db
		.insert(user)
		.values({
			authProviderId,
			email,
			username,
			createdAt,
			updatedAt
		})
		.onConflictDoNothing({ target: user.authProviderId });

	const dbUser = await findUserByAuthProviderId(authProviderId);
	if (!dbUser) {
		throw new Error('Unable to create user');
	}

	return dbUser;
}
