<script lang="ts">
	import '../app.css';
	// sort-ignore
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/common-ui/Button.svelte';
	import Dropdown from '$lib/components/common-ui/floating/Dropdown.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import Menu from '$lib/components/common-ui/Menu.svelte';
	import MenuItem from '$lib/components/common-ui/MenuItem.svelte';
	import NavbarSearch from '$lib/components/common-ui/NavbarSearch.svelte';
	import ScrollToTop from '$lib/components/common-ui/ScrollToTop.svelte';
	import Swap from '$lib/components/common-ui/Swap.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import { flip, shift } from '@skeletonlabs/floating-ui-svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	let lightModeEnabled = $state(false);
	let theme = $derived(lightModeEnabled ? 'light' : 'dark');
	let dropdownOpen = $state(false);
</script>

<div class="flex h-full w-full flex-col" data-theme={theme}>
	<Navbar class="grow-0 gap-4 bg-base-200">
		{#snippet start()}
			<Dropdown
				open={dropdownOpen}
				opts={{
					middleware: [shift({ padding: 10 }), flip()]
				}}
				activatorClass="btn-circle btn-ghost btn-sm btn"
				onDismiss={() => (dropdownOpen = false)}
			>
				{#snippet activator()}
					<Swap effect="swap-rotate" offIcon="menu" onIcon="close" bind:checked={dropdownOpen} />
				{/snippet}
				<Menu class="w-48 rounded-box border border-base-content/20 bg-base-100">
					<MenuItem href="/">
						<Icon icon="home" />
						Home
					</MenuItem>
					<MenuItem href="/about">
						<Icon icon="info" />
						About
					</MenuItem>
					<MenuItem href="/contact">
						<Icon icon="mail" />
						Contact
					</MenuItem>
				</Menu>
			</Dropdown>
			<a class="btn btn-ghost text-xl font-bold" href="/">PatchHub</a>
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
	<ScrollToTop />
	{@render children()}
</div>
