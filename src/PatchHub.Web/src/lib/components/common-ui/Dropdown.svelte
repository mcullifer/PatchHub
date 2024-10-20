<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		activator,
		content,
		class: classNames
	}: {
		activator?: Snippet;
		content: Snippet;
		class?: string;
	} = $props();

	let dropdownOpen = $state(false);

	export function open() {
		dropdownOpen = true;
	}

	export function close() {
		dropdownOpen = false;
	}

	export function toggle() {
		dropdownOpen = !dropdownOpen;
	}
</script>

<div class="dropdown dropdown-bottom {classNames}" class:dropdown-open={dropdownOpen}>
	{#if activator}
		<div tabindex="0" role="button">
			{@render activator()}
		</div>
	{/if}
	<div class="shadow-lg dropdown-content min-w-fit w-full bg-base-300 rounded-lg z-[1]">
		{@render content()}
	</div>
</div>
