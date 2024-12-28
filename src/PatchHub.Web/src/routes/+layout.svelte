<script lang="ts">
	import '../app.css';
	// sort-ignore
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/common-ui/Button.svelte';
	import Drawer from '$lib/components/common-ui/Drawer.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import NavbarSearch from '$lib/components/common-ui/NavbarSearch.svelte';
	import ScrollToTop from '$lib/components/common-ui/ScrollToTop.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	let lightModeEnabled = $state(false);
	let theme = $derived(lightModeEnabled ? 'light' : 'dark');
</script>

{#snippet hamburgerAndTitle()}
	<label for="my-drawer" class="btn btn-circle btn-ghost drawer-button btn-sm">
		<Icon icon="menu" size="md" />
	</label>
	<a class="btn btn-ghost text-xl font-bold" href="/">PatchHub</a>
{/snippet}

<div class="flex h-full w-full flex-col" data-theme={theme}>
	<Navbar class="relative grow-0 gap-4 bg-base-200">
		{#snippet start()}
			{@render hamburgerAndTitle()}
		{/snippet}
		{#snippet center()}
			<NavbarSearch />
		{/snippet}
		{#snippet end()}
			<label class="swap swap-rotate">
				<input
					type="checkbox"
					bind:checked={lightModeEnabled}
					value="light"
					class="theme-controller"
				/>
				<Icon icon="light_mode" class="swap-on" />
				<Icon icon="dark_mode" class="swap-off" />
			</label>
			{#if page.data.user}
				<Icon icon="person" />
				{page.data.user.username}
				<Button text="Logout" class="btn-primary btn-sm" onclick={() => goto('/logout')} />
			{:else if page.url.pathname !== '/login'}
				<Button text="Login" class="btn-primary btn-sm" onclick={() => goto('/login')} />
			{/if}
		{/snippet}
	</Navbar>
	<Drawer
		items={[
			{ label: 'Home', icon: 'home', href: '/' },
			{ label: 'About', icon: 'info', href: '/about' },
			{ label: 'Contact', icon: 'mail', href: '/contact' }
		]}
	>
		{#snippet title()}
			{@render hamburgerAndTitle()}
		{/snippet}
		{#snippet content()}
			<ScrollToTop />
			{@render children()}
		{/snippet}
	</Drawer>
</div>
