import { dev } from '$app/environment';
import {
	ANALYTICS_CONSENT_COOKIE,
	parseAnalyticsConsent,
	requiresAnalyticsConsent
} from '$lib/analytics/consent';
import { getAuthContext } from '$lib/server/auth/AuthContext';
import type { LayoutServerLoad } from './$types';

type LayoutUser = {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	profilePictureUrl: string | null;
	username: string | null;
};

export const load: LayoutServerLoad = async (event) => {
	const analyticsConsent = parseAnalyticsConsent(event.cookies.get(ANALYTICS_CONSENT_COOKIE));
	const analyticsConsentRequired = dev
		? event.url.searchParams.has('analytics-consent-preview')
		: requiresAnalyticsConsent(
				event.platform?.cf?.country,
				event.platform?.cf?.isEUCountry === '1'
			);
	const { workosUser, dbUser } = await getAuthContext(event);
	if (!workosUser) {
		return { analyticsConsent, analyticsConsentRequired, user: null };
	}

	const user: LayoutUser = {
		id: workosUser.id,
		email: workosUser.email,
		firstName: workosUser.firstName,
		lastName: workosUser.lastName,
		profilePictureUrl: workosUser.profilePictureUrl,
		username: dbUser?.username ?? null
	};

	return { analyticsConsent, analyticsConsentRequired, user };
};
