<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { hotkey, Hotkeys } from '$lib/actions/hotkey';
	import { Icon, Menu, MenuItem } from '$lib/components/common-ui';
	import Dropdown from '$lib/components/common-ui/floating/Dropdown.svelte';
	import type { ISteamApp } from '$lib/models/Steam';
	import { useDebounce } from 'runed';

	let dropdownOpen = $state(false);
	let debounceSearch = useDebounce(() => search(), 200);
	let searchInput = $state('');
	let searchResults = $state<ISteamApp[]>([]);
	let selectedIndex = $state(0);
	let inputElement = $state<HTMLInputElement>();

	async function search() {
		dropdownOpen = true;
		if (searchInput.length < 3) {
			searchResults = [];
			selectedIndex = 0;
			return;
		}
		const searchParams = new URLSearchParams({ query: searchInput });
		try {
			const response = await fetch('/api/games/search?' + searchParams.toString());
			const results = await response.json();
			searchResults = results;
			selectedIndex = 0; // Reset to first item when results arrive
		} catch {
			console.error('Failed to retrieve search results');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!searchResults.length) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				break;
			case 'Tab':
				// Make Tab behave like ArrowDown, Shift+Tab like ArrowUp
				e.preventDefault();
				if (e.shiftKey) {
					selectedIndex = Math.max(selectedIndex - 1, 0);
				} else {
					selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
				}
				break;
			case 'Enter':
				e.preventDefault();
				if (searchResults[selectedIndex]) {
					dropdownOpen = false;
					searchInput = '';
					goto(resolve(`/game/${searchResults[selectedIndex].appid}`));
				}
				break;
			case 'Escape':
				dropdownOpen = false;
				inputElement?.blur();
				break;
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
				bind:this={inputElement}
				use:hotkey={{
					hotkey: Hotkeys.Search,
					action: (searchInput) => searchInput.focus()
				}}
				bind:value={searchInput}
				type="text"
				placeholder="Search"
				oninput={debounceSearch}
				onkeydown={handleKeydown}
			/>
			{#if searchInput.length === 0}
				<kbd class="kbd kbd-sm">⌘ K</kbd>
			{/if}
		</label>
	{/snippet}
	<div class="bg-base-100 border-base-content/20 rounded-box max-h-96 overflow-y-auto border">
		<Menu class="w-full">
			{#each searchResults as result, i (i)}
				<MenuItem
					href={`/game/${result.appid}`}
					class={selectedIndex === i ? 'menu-active' : ''}
					onclick={() => {
						dropdownOpen = false;
						searchInput = '';
					}}
				>
					{result.name}
				</MenuItem>
			{:else}
				{#if searchInput.length > 0 && !debounceSearch.pending}
					<MenuItem>No results found</MenuItem>
				{:else}
					<MenuItem>Search for a game</MenuItem>
				{/if}
			{/each}
		</Menu>
	</div>
</Dropdown>
