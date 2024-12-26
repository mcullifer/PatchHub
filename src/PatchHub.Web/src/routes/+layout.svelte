<script lang="ts">
	import '../app.css';
	// sort-ignore
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { hotkey, Hotkeys } from '$lib/actions/hotkey';
	import Button from '$lib/components/common-ui/Button.svelte';
	import Drawer from '$lib/components/common-ui/Drawer.svelte';
	import Dropdown from '$lib/components/common-ui/Dropdown.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import Menu from '$lib/components/common-ui/Menu.svelte';
	import MenuItem from '$lib/components/common-ui/MenuItem.svelte';
	import ScrollToTop from '$lib/components/common-ui/ScrollToTop.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import type { ISteamApp } from '$lib/models/Steam';
	import { useDebounce } from 'runed';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	let dropdown = $state<ReturnType<typeof Dropdown>>();
	let searchInput = $state('');
	let searchResults = $state<ISteamApp[]>([]);
	let lightModeEnabled = $state(false);
	let theme = $derived(lightModeEnabled ? 'light' : 'dark');

	let debounceSearch = useDebounce(() => search(), 200);

	async function search() {
		if (searchInput.length < 3) {
			searchResults = [];
			return;
		}
		const searchParams = new URLSearchParams({ query: searchInput });
		try {
			const response = await fetch('/api/games/search?' + searchParams.toString());
			const results = await response.json();
			searchResults = results;
		} catch {
			console.error('Failed to retrieve search results');
		}
	}
</script>

{#snippet hamburgerAndTitle()}
	<label for="my-drawer" class="btn btn-circle btn-ghost drawer-button btn-sm">
		<Icon icon="menu" size="md" />
	</label>
	<a class="btn btn-ghost text-xl font-bold" href="/">PatchHub</a>
{/snippet}

<div class="flex h-full flex-col" data-theme={theme}>
	<Navbar class="relative grow-0 bg-base-200">
		{#snippet start()}
			{@render hamburgerAndTitle()}
		{/snippet}
		{#snippet center()}
			<Dropdown
				bind:this={dropdown}
				class="w-full max-w-sm"
				dropdownClasses="overflow-y-auto max-h-96"
			>
				{#snippet activator()}
					<label class="input input-bordered flex items-center gap-2">
						<Icon icon="search" />
						<input
							use:hotkey={{ hotkey: Hotkeys.Search, action: (searchInput) => searchInput.focus() }}
							bind:value={searchInput}
							type="text"
							placeholder="Search"
							oninput={debounceSearch}
						/>
					</label>
				{/snippet}
				{#snippet content()}
					<Menu>
						{#each searchResults as result}
							<MenuItem href={`/game/${result.appid}`}>{result.name}</MenuItem>
						{:else}
							<MenuItem>Search for a game</MenuItem>
						{/each}
					</Menu>
				{/snippet}
			</Dropdown>
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
