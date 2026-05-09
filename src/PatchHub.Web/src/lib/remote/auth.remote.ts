import { form, getRequestEvent } from '$app/server';
import { createOrGetUserForWorkOSUser, findUserByUsername } from '$lib/server/UserService';
import { updateWorkOSUser } from '$lib/server/WorkOSClient';
import { error, redirect } from '@sveltejs/kit';
import * as v from 'valibot';

export const setupAccount = form(
	v.objectAsync({
		username: v.pipeAsync(
			v.string(),
			v.trim(),
			v.minLength(3, 'Username must be at least 3 characters'),
			v.maxLength(20, 'Username must be at most 20 characters'),
			v.regex(
				/^[a-zA-Z0-9_-]+$/,
				'Username can only contain letters, numbers, underscores, and hyphens'
			),
			v.checkAsync(
				async (input) => (await findUserByUsername(input)) === null,
				'Username is already taken'
			)
		)
	}),
	async ({ username }) => {
		const { locals } = getRequestEvent();
		if (!locals.auth.user) {
			error(401, 'Not authenticated');
		}
		const workosUser = locals.auth.user;
		const dbUser = await createOrGetUserForWorkOSUser(
			workosUser.id,
			workosUser.email,
			username,
			new Date(workosUser.createdAt),
			new Date(workosUser.updatedAt)
		);

		// Update WorkOS user with external ID
		await updateWorkOSUser({
			userId: workosUser.id,
			externalId: dbUser.id.toString(),
			metadata: { username: dbUser.username }
		});

		throw redirect(302, '/');
	}
);
