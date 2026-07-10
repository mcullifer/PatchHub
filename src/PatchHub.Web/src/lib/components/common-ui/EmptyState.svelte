<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import type { Snippet } from 'svelte';

	let {
		icon = 'inbox',
		title,
		description,
		children
	}: {
		icon?: string;
		title: string;
		description?: string;
		children?: Snippet;
	} = $props();
</script>

<div
	class="border-base-300 bg-base-200 rounded-box flex flex-col items-center gap-2 border border-dashed px-4 py-10 text-center"
>
	<Icon {icon} size="xl" class="text-base-content/40" />
	<h2 class="text-lg font-semibold">{title}</h2>
	{#if description}
		<p class="text-base-content/60 max-w-sm text-sm">
			{description}
		</p>
	{/if}
	{#if children}
		<div class="mt-2 flex flex-wrap items-center justify-center gap-2">
			{@render children()}
		</div>
	{/if}
</div>
