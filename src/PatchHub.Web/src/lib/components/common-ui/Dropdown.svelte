<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		activator,
		content,
		class: classNames,
		dropdownClasses = ''
	}: {
		activator?: Snippet;
		content: Snippet;
		class?: string;
		dropdownClasses?: string;
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
		<div tabindex="0" role="button" class="w-full">
			{@render activator()}
		</div>
	{/if}
	<div
		class="dropdown-content z-[1] w-full min-w-fit rounded-lg bg-base-300 shadow-lg {dropdownClasses}"
	>
		{@render content()}
	</div>
</div>
