<script lang="ts">
	import '../app.css';
	// sort-ignore
	import Drawer from '$lib/components/common-ui/Drawer.svelte';
	import Dropdown from '$lib/components/common-ui/Dropdown.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import Menu from '$lib/components/common-ui/Menu.svelte';
	import MenuItem from '$lib/components/common-ui/MenuItem.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import type { SteamApp } from '$lib/models/Steam';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	let dropdown = $state<ReturnType<typeof Dropdown>>();
	let searchInput = $state('');
	let searchResults = $state<SteamApp[]>([]);

	async function search() {
		const searchParams = new URLSearchParams({ query: searchInput });
		const response = await fetch('/api/games/search?' + searchParams.toString());
		const results = await response.json();
		searchResults = results;
	}
</script>

{#snippet hamburgerAndTitle()}
	<label for="my-drawer" class="btn btn-circle btn-ghost drawer-button btn-sm">
		<Icon icon="menu" />
	</label>
	<a class="select-none text-xl font-bold" href="/">PatchHub</a>
{/snippet}

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
					<input bind:value={searchInput} type="text" placeholder="Search" oninput={search} />
				</label>
			{/snippet}
			{#snippet content()}
				<Menu>
					{#each searchResults as result}
						<MenuItem href={`/${result.appid}`}>{result.name}</MenuItem>
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
	<!-- <Button icon="menu" class="btn-circle btn-ghost btn-sm" /> -->
	{@render children()}
</Drawer>
