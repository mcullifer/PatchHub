<script lang="ts">
	import { dev } from '$app/environment';
	import { beforeNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { env } from '$env/dynamic/public';
	import {
		ANALYTICS_CONSENT_COOKIE,
		analyticsCaptureAllowed,
		type AnalyticsConsent
	} from '$lib/analytics/consent';
	import { Button } from '$lib/components/common-ui';
	import posthog from 'posthog-js';

	type AnalyticsUser = {
		id: string;
		username: string | null;
	};

	let {
		user,
		consentRequired,
		consent,
		onConsentChange,
		settingsOpen = $bindable(false)
	}: {
		user: AnalyticsUser | null;
		consentRequired: boolean;
		consent: AnalyticsConsent | null;
		onConsentChange: (consent: AnalyticsConsent) => void;
		settingsOpen?: boolean;
	} = $props();

	const productionHostnames = new Set(['patchhub.io', 'www.patchhub.io']);
	const consentCookieMaxAgeSeconds = 60 * 60 * 24 * 365;
	let initialized = false;
	let identifiedUser: AnalyticsUser | null = null;
	const showConsentPanel = $derived((consentRequired && consent === null) || settingsOpen);

	function initialize(): boolean {
		if (initialized) return true;

		const token = env.PUBLIC_POSTHOG_TOKEN;
		const host = env.PUBLIC_POSTHOG_HOST;
		const isProductionHost = productionHostnames.has(window.location.hostname);

		if (dev || !isProductionHost || !token || !host) return false;

		posthog.init(token, {
			api_host: host,
			defaults: '2026-06-25',
			autocapture: true,
			capture_pageview: 'history_change',
			capture_performance: { web_vitals: true },
			person_profiles: 'identified_only',
			opt_out_persistence_by_default: true,
			tracing_headers: [window.location.hostname],
			disable_session_recording: true,
			advanced_disable_feature_flags: true
		});
		initialized = true;
		return true;
	}

	function enableCapture(): boolean {
		if (!initialize()) return false;
		if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();

		return true;
	}

	function resetIdentity(): void {
		if (!initialized) return;

		posthog.reset();
		identifiedUser = null;
	}

	function disableCapture(): void {
		if (!initialized) return;

		resetIdentity();
		posthog.opt_out_capturing();
	}

	function chooseConsent(choice: AnalyticsConsent): void {
		const secure = window.location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${consentCookieMaxAgeSeconds}; SameSite=Lax${secure}`;
		onConsentChange(choice);
		settingsOpen = false;
	}

	beforeNavigate(({ to }) => {
		if (to?.url.pathname === '/auth/logout') resetIdentity();
	});

	$effect(() => {
		const captureAllowed = analyticsCaptureAllowed(consentRequired, consent);
		if (!captureAllowed) {
			disableCapture();
			return;
		}

		if (!enableCapture()) return;

		if (!user) {
			if (identifiedUser) resetIdentity();
			return;
		}

		const identityIsCurrent =
			identifiedUser?.id === user.id && identifiedUser.username === user.username;
		if (identityIsCurrent) return;

		posthog.identify(user.id, user.username ? { username: user.username } : undefined);
		identifiedUser = { id: user.id, username: user.username };
	});
</script>

{#if showConsentPanel}
	<div class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
		<section
			aria-labelledby="analytics-consent-title"
			class="alert alert-vertical sm:alert-horizontal bg-base-100 text-base-content border-base-content/20 pointer-events-auto w-full max-w-2xl border shadow-lg"
		>
			<div>
				<h2 id="analytics-consent-title" class="font-semibold">Optional analytics</h2>
				<p class="text-base-content/70 mt-1 text-sm">
					PatchHub uses PostHog to understand traffic and feature usage. You can accept or reject
					this optional tracking. See the
					<a class="link link-primary link-hover" href={resolve('/privacy')}>privacy policy</a>.
				</p>
			</div>
			<div class="flex flex-wrap gap-2 sm:justify-end">
				<Button
					class="btn-primary btn-sm w-24"
					text="Accept"
					onclick={() => chooseConsent('granted')}
				/>
				<Button
					class="btn-outline btn-sm w-24"
					text="Reject"
					onclick={() => chooseConsent('denied')}
				/>
				{#if consent !== null}
					<Button
						class="btn-ghost btn-sm w-24"
						text="Close"
						onclick={() => (settingsOpen = false)}
					/>
				{/if}
			</div>
		</section>
	</div>
{/if}
