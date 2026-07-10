import type { ParamMatcher } from '@sveltejs/kit';
import {
	isReservedOwnerSlug,
	normalizeUsername,
	OWNER_ROUTE_SLUG_PATTERN
} from '$convex/lib/usernames';

export const match: ParamMatcher = (param) => {
	const normalizedParam = normalizeUsername(param);

	return OWNER_ROUTE_SLUG_PATTERN.test(normalizedParam) && !isReservedOwnerSlug(normalizedParam);
};
