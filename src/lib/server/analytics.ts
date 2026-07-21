import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import {
	ANALYTICS_CONSENT_COOKIE,
	analyticsCaptureAllowed,
	parseAnalyticsConsent,
	requiresAnalyticsConsent
} from '$lib/analytics/consent';
import type { RequestEvent } from '@sveltejs/kit';
import { PostHog } from 'posthog-node';

const productionHostnames = new Set(['patchhub.io', 'www.patchhub.io']);

export type ServerAnalyticsEventName =
	| 'account setup completed'
	| 'external item favorite added'
	| 'external item favorite removed'
	| 'project banner uploaded'
	| 'project created'
	| 'project favorite added'
	| 'project favorite removed'
	| 'project post created'
	| 'project post deleted'
	| 'project post status changed'
	| 'project post updated'
	| 'project updated';

type AnalyticsProperty = boolean | number | string;

type ServerAnalyticsEvent = {
	name: ServerAnalyticsEventName;
	properties?: Record<string, AnalyticsProperty>;
};

type PostHogConfig = {
	host: string;
	token: string;
};

export async function captureServerEvent(
	requestEvent: RequestEvent,
	distinctId: string,
	analyticsEvent: ServerAnalyticsEvent
): Promise<void> {
	const config = getConfig(requestEvent);
	if (!config) return;

	const capturePromise = sendEvent(config, requestEvent, distinctId, analyticsEvent);
	const executionContext = requestEvent.platform?.ctx;

	if (executionContext) {
		executionContext.waitUntil(capturePromise);
		return;
	}

	await capturePromise;
}

function getConfig(requestEvent: RequestEvent): PostHogConfig | null {
	const host = env.PUBLIC_POSTHOG_HOST;
	const token = env.PUBLIC_POSTHOG_TOKEN;
	const isProduction = !dev && productionHostnames.has(requestEvent.url.hostname);
	if (!isProduction || !host || !token) return null;

	const consent = parseAnalyticsConsent(requestEvent.cookies.get(ANALYTICS_CONSENT_COOKIE));
	const consentRequired = requiresAnalyticsConsent(
		requestEvent.platform?.cf?.country,
		requestEvent.platform?.cf?.isEUCountry === '1'
	);

	return analyticsCaptureAllowed(consentRequired, consent) ? { host, token } : null;
}

async function sendEvent(
	config: PostHogConfig,
	requestEvent: RequestEvent,
	distinctId: string,
	analyticsEvent: ServerAnalyticsEvent
): Promise<void> {
	const client = new PostHog(config.token, {
		host: config.host,
		flushAt: 1,
		flushInterval: 0
	});
	const sessionId = requestEvent.request.headers.get('X-POSTHOG-SESSION-ID');

	try {
		client.capture({
			distinctId,
			event: analyticsEvent.name,
			properties: {
				...analyticsEvent.properties,
				...(sessionId ? { $session_id: sessionId } : {})
			}
		});
		await client.shutdown();
	} catch (error) {
		console.error('Failed to capture PostHog server event', {
			event: analyticsEvent.name,
			error
		});
	}
}
