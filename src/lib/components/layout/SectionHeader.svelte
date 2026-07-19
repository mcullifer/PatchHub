<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import type { Snippet } from 'svelte';

	let {
		icon,
		title,
		subtitle,
		meta
	}: {
		icon: string;
		title: string;
		subtitle?: string;
		meta?: Snippet;
	} = $props();
</script>

<div
	class="border-base-content/10 mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-4"
>
	<div class="flex items-center gap-4">
		<div class="bg-base-200 text-primary rounded-box grid size-12 place-items-center">
			<Icon {icon} size="md" />
		</div>
		<div>
			<h2 class="text-2xl font-bold">{title}</h2>
			{#if subtitle}
				<p class="text-base-content/60 text-sm">{subtitle}</p>
			{/if}
		</div>
	</div>
	{#if meta}
		{@render meta()}
	{/if}
</div>
