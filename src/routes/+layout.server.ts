import { dev } from '$app/environment';
import {
	ANALYTICS_CONSENT_COOKIE,
	parseAnalyticsConsent,
	requiresAnalyticsConsent
} from '$lib/analytics/consent';
import type { CurrentUser } from '$lib/contexts/currentUser';
import { getAuthContext } from '$lib/server/auth/authContext';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const analyticsConsent = parseAnalyticsConsent(event.cookies.get(ANALYTICS_CONSENT_COOKIE));
	const analyticsConsentRequired = dev
		? event.url.searchParams.has('analytics-consent-preview')
		: requiresAnalyticsConsent(
				event.platform?.cf?.country,
				event.platform?.cf?.isEUCountry === '1'
			);
	const { workosUser, user: patchHubUser } = await getAuthContext(event);
	if (!workosUser) {
		return { analyticsConsent, analyticsConsentRequired, user: null };
	}

	const user: CurrentUser = {
		id: patchHubUser?._id ?? null,
		analyticsId: workosUser.id,
		email: workosUser.email,
		firstName: workosUser.firstName,
		lastName: workosUser.lastName,
		profilePictureUrl: workosUser.profilePictureUrl,
		username: patchHubUser?.username ?? null
	};

	return { analyticsConsent, analyticsConsentRequired, user };
};
