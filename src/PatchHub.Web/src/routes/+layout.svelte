<script lang="ts">
	import '../app.css';
	// sort-ignore
	import { hotkey, Hotkeys } from '$lib/actions/hotkey';
	import Drawer from '$lib/components/common-ui/Drawer.svelte';
	import Dropdown from '$lib/components/common-ui/Dropdown.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import Menu from '$lib/components/common-ui/Menu.svelte';
	import MenuItem from '$lib/components/common-ui/MenuItem.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import type { ISteamApp } from '$lib/models/Steam';
	import { useDebounce } from 'runed';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	let dropdown = $state<ReturnType<typeof Dropdown>>();
	let searchInput = $state('');
	let searchResults = $state<ISteamApp[]>([]);

	let scrollPos = $state(0);
	let windowHeight = $state(0);
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
		} catch (e) {
			console.error('Failed to retrieve search results');
		}
	}
</script>

{#snippet hamburgerAndTitle()}
	<label for="my-drawer" class="btn btn-circle btn-ghost drawer-button btn-sm">
		<Icon icon="menu" />
	</label>
	<a class="btn btn-ghost select-none text-xl font-bold" href="/">PatchHub</a>
{/snippet}

<svelte:window bind:scrollY={scrollPos} bind:innerHeight={windowHeight} />

<Navbar class="relative bg-base-200">
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
		<Icon icon="person" />
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
		{#if scrollPos > windowHeight}
			<button
				class="btn btn-circle btn-primary fixed bottom-4 right-4"
				onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
			>
				<Icon icon="arrow_upward" />
			</button>
		{/if}
		{@render children()}
	{/snippet}
</Drawer>
