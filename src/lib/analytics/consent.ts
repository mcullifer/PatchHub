export const ANALYTICS_CONSENT_COOKIE = 'patchhub_analytics_consent';

export type AnalyticsConsent = 'denied' | 'granted';

const CONSENT_REQUIRED_NON_EU_COUNTRIES = new Set(['GB', 'IS', 'LI', 'NO']);

export function parseAnalyticsConsent(value: string | null | undefined): AnalyticsConsent | null {
	return value === 'denied' || value === 'granted' ? value : null;
}

export function requiresAnalyticsConsent(
	country: string | null | undefined,
	isEuropeanUnionCountry: boolean
): boolean {
	if (isEuropeanUnionCountry) return true;
	if (!country) return true;

	const countryCode = country.toUpperCase();
	if (countryCode === 'T1' || countryCode === 'XX') return true;

	return CONSENT_REQUIRED_NON_EU_COUNTRIES.has(countryCode);
}

export function analyticsCaptureAllowed(
	consentRequired: boolean,
	consent: AnalyticsConsent | null
): boolean {
	if (consent === 'denied') return false;
	return consent === 'granted' || !consentRequired;
}
