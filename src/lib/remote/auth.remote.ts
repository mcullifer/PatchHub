import { form, getRequestEvent } from '$app/server';
import { api } from '$convex/_generated/api';
import { captureServerEvent } from '$lib/server/analytics';
import { getAuthContext } from '$lib/server/auth/authContext';
import { ACCOUNT_DISABLED_ERROR_CODE } from '$lib/server/auth/provisioning';
import { createAuthenticatedConvexClient, createConvexClient } from '$lib/server/convex';
import {
	USERNAME_MAX_LENGTH,
	USERNAME_MIN_LENGTH,
	USERNAME_PATTERN,
	USERNAME_RULE_MESSAGE
} from '$convex/lib/usernames';
import { updateWorkOSUserExternalId } from '$lib/server/auth/workos';
import { error, redirect } from '@sveltejs/kit';
import * as v from 'valibot';

const setupAccountSchema = v.objectAsync({
	username: v.pipeAsync(
		v.string(),
		v.trim(),
		v.toLowerCase(),
		v.minLength(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`),
		v.maxLength(USERNAME_MAX_LENGTH, `Username must be at most ${USERNAME_MAX_LENGTH} characters`),
		v.regex(USERNAME_PATTERN, USERNAME_RULE_MESSAGE),
		v.checkAsync(async (username) => {
			const convex = createConvexClient();
			return !(await convex.query(api.users.isUsernameTaken, { username }));
		}, 'Username is already taken')
	)
});

export const setupAccount = form(setupAccountSchema, async ({ username }) => {
	const event = getRequestEvent();
	const { status, workosUser } = await getAuthContext(event);
	if (!workosUser) {
		error(401, 'Not authenticated');
	}

	if (status === 'deleted') {
		redirect(302, `/auth/error?code=${ACCOUNT_DISABLED_ERROR_CODE}`);
	}

	if (status === 'active') {
		redirect(302, '/');
	}

	const convex = createAuthenticatedConvexClient(event);
	const user = await convex.mutation(api.users.getOrCreate, {
		email: workosUser.email ?? undefined,
		username,
		createdAt: new Date(workosUser.createdAt).getTime(),
		updatedAt: new Date(workosUser.updatedAt).getTime()
	});

	try {
		await updateWorkOSUserExternalId({
			userId: workosUser.id,
			externalId: user._id
		});
	} catch (updateError) {
		console.error('Failed to update WorkOS user externalId after account setup', {
			workosUserId: workosUser.id,
			userId: user._id,
			updateError
		});
	}

	await captureServerEvent(event, workosUser.id, {
		name: 'account setup completed'
	});

	redirect(302, '/');
});
