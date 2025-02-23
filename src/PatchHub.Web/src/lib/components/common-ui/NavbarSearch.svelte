<script lang="ts">
	import { hotkey, Hotkeys } from '$lib/actions/hotkey';
	import Dropdown from '$lib/components/common-ui/Dropdown.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import Menu from '$lib/components/common-ui/Menu.svelte';
	import MenuItem from '$lib/components/common-ui/MenuItem.svelte';
	import type { ISteamApp } from '$lib/models/Steam';
	import { useDebounce } from 'runed';

	let debounceSearch = useDebounce(() => search(), 200);
	let searchInput = $state('');
	let searchResults = $state<ISteamApp[]>([]);

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

<Dropdown class="hidden w-full max-w-sm sm:flex" dropdownClasses="overflow-y-auto max-h-96">
	{#snippet activator()}
		<label class="input input-bordered flex w-full items-center gap-2">
			<Icon icon="search" size="sm" />
			<input
				use:hotkey={{
					hotkey: Hotkeys.Search,
					action: (searchInput) => searchInput.focus()
				}}
				bind:value={searchInput}
				type="text"
				placeholder="Search"
				oninput={debounceSearch}
			/>
			{#if searchInput.length === 0}
				<kbd class="kbd kbd-sm">⌘</kbd>
				<kbd class="kbd kbd-sm">K</kbd>
			{/if}
		</label>
	{/snippet}
	{#snippet content()}
		<Menu class="w-full">
			{#each searchResults as result}
				<MenuItem href={`/game/${result.appid}`}>{result.name}</MenuItem>
			{:else}
				<MenuItem>Search for a game</MenuItem>
			{/each}
		</Menu>
	{/snippet}
</Dropdown>
