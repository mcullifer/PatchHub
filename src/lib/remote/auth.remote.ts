import { form, getRequestEvent } from '$app/server';
import { captureServerEvent } from '$lib/server/analytics';
import { getAuthContext } from '$lib/server/auth/AuthContext';
import { ACCOUNT_DISABLED_ERROR_CODE } from '$lib/server/auth/provisioning';
import { getOrCreateUserForWorkOSUser, isUsernameTaken } from '$lib/server/auth/users';
import {
	USERNAME_MAX_LENGTH,
	USERNAME_MIN_LENGTH,
	USERNAME_PATTERN,
	USERNAME_RULE_MESSAGE
} from '$convex/lib/usernames';
import { updateWorkOSUserExternalId } from '$lib/server/auth/workos';
import { error, redirect } from '@sveltejs/kit';
import * as v from 'valibot';

export const setupAccount = form(
	v.objectAsync({
		username: v.pipeAsync(
			v.string(),
			v.trim(),
			v.toLowerCase(),
			v.minLength(
				USERNAME_MIN_LENGTH,
				`Username must be at least ${USERNAME_MIN_LENGTH} characters`
			),
			v.maxLength(
				USERNAME_MAX_LENGTH,
				`Username must be at most ${USERNAME_MAX_LENGTH} characters`
			),
			v.regex(USERNAME_PATTERN, USERNAME_RULE_MESSAGE),
			v.checkAsync(async (input) => !(await isUsernameTaken(input)), 'Username is already taken')
		)
	}),
	async ({ username }) => {
		const event = getRequestEvent();
		const { internalUserStatus, workosUser } = await getAuthContext(event);
		if (!workosUser) {
			error(401, 'Not authenticated');
		}

		if (internalUserStatus === 'deleted') {
			redirect(302, `/auth/error?code=${ACCOUNT_DISABLED_ERROR_CODE}`);
		}

		if (internalUserStatus === 'active') {
			redirect(302, '/');
		}

		const dbUser = await getOrCreateUserForWorkOSUser(
			workosUser.id,
			workosUser.email,
			username,
			new Date(workosUser.createdAt),
			new Date(workosUser.updatedAt)
		);

		try {
			await updateWorkOSUserExternalId({
				userId: workosUser.id,
				externalId: dbUser._id
			});
		} catch (updateError) {
			console.error('Failed to update WorkOS user externalId after account setup', {
				workosUserId: workosUser.id,
				dbUserId: dbUser._id,
				updateError
			});
		}

		await captureServerEvent(event, workosUser.id, {
			name: 'account setup completed'
		});

		redirect(302, '/');
	}
);
