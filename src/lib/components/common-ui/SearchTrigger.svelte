<script lang="ts">
	import { hotkey, Hotkeys } from '$lib/actions/hotkey';
	import { Icon } from '$lib/components/common-ui';
	import { hasKeyboard, modifierKey } from '$lib/util/keyboard';
	import SearchPalette from './SearchPalette.svelte';

	let open = $state(false);

	function toggle() {
		open = !open;
	}
</script>

<!-- sm+: an input-styled trigger. The window-scoped ⌘K hotkey is registered once, here. -->
<button
	type="button"
	onclick={() => (open = true)}
	use:hotkey={{ hotkey: Hotkeys.Search, action: toggle }}
	class="input mx-auto hidden w-full max-w-sm cursor-pointer items-center gap-2 sm:flex"
	aria-label="Search"
>
	<Icon icon="search" size="sm" class="text-base-content/50 select-none" />
	<span class="text-base-content/50 grow text-left">Search</span>
	{#if hasKeyboard.current}
		<kbd class="kbd kbd-sm">{modifierKey} K</kbd>
	{/if}
</button>

<!-- Below sm: a compact icon trigger so search stays reachable on mobile. -->
<button
	type="button"
	onclick={() => (open = true)}
	class="btn btn-ghost btn-square btn-sm sm:hidden"
	aria-label="Search"
>
	<Icon icon="search" size="sm" />
</button>

<SearchPalette bind:open />
