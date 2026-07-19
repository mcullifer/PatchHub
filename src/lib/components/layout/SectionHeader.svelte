<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		attribution
	}: {
		title: string;
		attribution?: Snippet;
	} = $props();
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
	<h2 class="text-base-content/50 text-xs font-semibold tracking-widest uppercase">{title}</h2>
	{#if attribution}
		<p class="text-base-content/50 flex items-center gap-1.5 text-xs">
			{@render attribution()}
		</p>
	{/if}
</div>
