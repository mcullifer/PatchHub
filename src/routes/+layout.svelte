<script lang="ts">
	import '../app.css';
	// sort-ignore
	import { resolve } from '$app/paths';
	import type { AnalyticsConsent } from '$lib/analytics/consent';
	import Analytics from '$lib/components/Analytics.svelte';
	import { Icon, ScrollToTop, SearchTrigger } from '$lib/components/common-ui';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import ProfileDropdown from '$lib/components/ProfileDropdown.svelte';
	import { setCurrentUser } from '$lib/contexts/currentUser';
	import type { Snippet } from 'svelte';
	import { version as appVersion } from '../../package.json';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	setCurrentUser(() => data.user);

	let lightModeEnabled = $state(false);
	let analyticsConsentOverride = $state<AnalyticsConsent | null>(null);
	let analyticsSettingsOpen = $state(false);
	let theme = $derived(lightModeEnabled ? 'light' : 'dark');
	let analyticsConsent = $derived(analyticsConsentOverride ?? data.analyticsConsent);
	let showAnalyticsSettings = $derived(data.analyticsConsentRequired || analyticsConsent !== null);

	$effect(() => {
		document.documentElement.dataset.theme = theme;
	});
</script>

<Analytics
	user={data.user}
	consentRequired={data.analyticsConsentRequired}
	consent={analyticsConsent}
	onConsentChange={(consent) => (analyticsConsentOverride = consent)}
	bind:settingsOpen={analyticsSettingsOpen}
/>

<div class="flex min-h-full w-full flex-col">
	<Navbar class="bg-base-300 sticky top-0 z-50 gap-2 sm:gap-4">
		{#snippet start()}
			<a class="flex gap-0 px-4 text-2xl font-bold" href={resolve('/')}>
				<span class={lightModeEnabled ? 'text-base-content' : 'text-white'}>patch</span>
				<span class="text-primary">hub</span>
			</a>
		{/snippet}
		{#snippet center()}
			<SearchTrigger />
		{/snippet}
		{#snippet end()}
			<label class="swap swap-rotate">
				<input
					id="theme-toggle"
					type="checkbox"
					bind:checked={lightModeEnabled}
					value="light"
					class="theme-controller"
				/>
				<Icon icon="light_mode" class="swap-on" />
				<Icon icon="dark_mode" class="swap-off" />
			</label>
			{#if data.user}
				<ProfileDropdown class="w-8 rounded" user={data.user} />
			{:else}
				<a class="btn btn-primary btn-sm px-2 sm:px-3" href={resolve('/auth/login')}>
					<span class="hidden sm:inline">Login / Signup</span>
					<span class="sm:hidden">Login</span>
					<Icon icon="arrow_forward" size="sm" />
				</a>
			{/if}
		{/snippet}
	</Navbar>
	<ScrollToTop />
	<main class="min-h-0 flex-1">
		{@render children()}
	</main>
	<footer class="footer footer-center bg-base-200 text-base-content/60 gap-2 px-4 py-6 text-sm">
		<nav class="flex gap-4">
			<a class="link link-hover" href={resolve('/about')}>About</a>
			<a class="link link-hover" href={resolve('/privacy')}>Privacy</a>
			<a class="link link-hover" href={resolve('/terms')}>Terms</a>
			{#if showAnalyticsSettings}
				<button
					class="link link-hover"
					type="button"
					onclick={() => (analyticsSettingsOpen = true)}
				>
					Analytics settings
				</button>
			{/if}
		</nav>
		<p>PatchHub · beta · v{appVersion}</p>
	</footer>
</div>
