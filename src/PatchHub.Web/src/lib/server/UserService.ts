import { eq } from 'drizzle-orm';
import { db } from './db';
import { user, type User } from './db/schema';

/**
 * Finds a user by their WorkOS auth provider ID
 * @param authProviderId - The WorkOS user ID
 * @returns The user if found, null otherwise
 */
export async function findUserByAuthProviderId(authProviderId: string): Promise<User | null> {
	const result = await db.select().from(user).where(eq(user.authProviderId, authProviderId));
	return result[0] ?? null;
}

/**
 * Finds a user by their username
 * @param username - The username to search for
 * @returns The user if found, null otherwise
 */
export async function findUserByUsername(username: string): Promise<User | null> {
	const result = await db.select().from(user).where(eq(user.username, username));
	return result[0] ?? null;
}

/**
 * Creates a new user in the database
 * @param authProviderId - The WorkOS user ID
 * @param email - User's email address
 * @param username - User's username (optional)
 * @param createdAt - User's creation timestamp from WorkOS
 * @param updatedAt - User's last update timestamp from WorkOS
 * @returns The newly created user
 */
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
