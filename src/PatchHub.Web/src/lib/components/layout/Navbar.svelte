<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		start,
		center,
		end,
		class: classNames = 'bg-base-100'
	}: {
		class?: string;
		start?: Snippet;
		center?: Snippet;
		end?: Snippet;
	} = $props();
</script>

<div class="navbar {classNames}">
	<div class="navbar-start gap-2">
		{#if start}
			{@render start()}
		{/if}
	</div>
	<div class="navbar-center sm:w-1/2 justify-center gap-2">
		{#if center}
			{@render center()}
		{/if}
	</div>
	<div class="navbar-end gap-2">
		{#if end}
			{@render end()}
		{/if}
	</div>
</div>
