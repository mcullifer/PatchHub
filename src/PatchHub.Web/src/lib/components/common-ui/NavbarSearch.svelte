<script lang="ts">
	import { hotkey, Hotkeys } from '$lib/actions/hotkey';
	import { Icon, Menu, MenuItem } from '$lib/components/common-ui';
	import Dropdown from '$lib/components/common-ui/floating/Dropdown.svelte';
	import type { ISteamApp } from '$lib/models/Steam';
	import { useDebounce } from 'runed';

	let dropdownOpen = $state(false);
	let debounceSearch = useDebounce(() => search(), 200);
	let searchInput = $state('');
	let searchResults = $state<ISteamApp[]>([]);

	async function search() {
		dropdownOpen = true;
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

<Dropdown bind:open={dropdownOpen}>
	{#snippet activator(floating, interactions)}
		<label
			bind:this={floating.elements.reference}
			{...interactions.getReferenceProps()}
			class="input flex max-w-sm items-center gap-2"
		>
			<Icon icon="search" size="sm" class="select-none" />
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
				<kbd class="kbd kbd-sm">⌘ K</kbd>
			{/if}
		</label>
	{/snippet}
	<div class="bg-base-100 border-base-content/20 rounded-box max-h-96 overflow-y-auto border">
		<Menu>
			{#each searchResults as result, i (i)}
				<MenuItem href={`/game/${result.appid}`}>{result.name}</MenuItem>
			{:else}
				<MenuItem>Search for a game</MenuItem>
			{/each}
		</Menu>
	</div>
</Dropdown>
