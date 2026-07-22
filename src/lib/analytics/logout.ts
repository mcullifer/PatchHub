import posthog from 'posthog-js';

// Forget the identified user when logout is submitted. The logout POST is a
// native form submission, so navigation hooks never see it.
export function resetAnalyticsIdentity(): void {
	if (posthog.__loaded) posthog.reset();
}
