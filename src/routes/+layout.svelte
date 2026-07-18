<script lang="ts">
	import '../app.css';
	// sort-ignore
	import { resolve } from '$app/paths';
	import { Icon, ScrollToTop } from '$lib/components/common-ui';
	import NavbarSearch from '$lib/components/common-ui/NavbarSearch.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import ProfileDropdown from '$lib/components/ProfileDropdown.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	let lightModeEnabled = $state(false);
	let theme = $derived(lightModeEnabled ? 'light' : 'dark');

	$effect(() => {
		document.documentElement.dataset.theme = theme;
	});
</script>

<div class="flex h-full w-full flex-col">
	<Navbar class="bg-base-200 gap-2 sm:gap-4">
		{#snippet start()}
			<a class="flex gap-0 px-4 text-xl font-bold" href={resolve('/')}>
				<span class={lightModeEnabled ? 'text-base-content' : 'text-white'}>patch</span>
				<span class="text-primary">hub</span>
			</a>
		{/snippet}
		{#snippet center()}
			<div class="hidden w-full sm:block">
				<NavbarSearch />
			</div>
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
</div>
