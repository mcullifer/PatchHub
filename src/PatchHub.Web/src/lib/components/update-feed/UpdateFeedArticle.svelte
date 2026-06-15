<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import type { Snippet } from 'svelte';
	import type { UpdateFeedMetaItem } from './UpdateFeedTypes';

	let {
		title,
		sourceLabel,
		sourceUrl = null,
		meta = [],
		children
	}: {
		title: string;
		sourceLabel: string;
		sourceUrl?: string | null;
		meta?: UpdateFeedMetaItem[];
		children: Snippet;
	} = $props();

	function openSource(url: string): void {
		window.open(url, '_blank', 'noopener,noreferrer');
	}
</script>

<article class="card bg-base-200 border-base-300 border">
	<div class="card-body gap-6 p-4 sm:p-6 lg:p-8">
		<header class="border-base-300 border-b pb-6">
			<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<h2 class="max-w-4xl text-2xl leading-tight font-bold text-pretty md:text-4xl">
					{title}
				</h2>
				{#if sourceUrl}
					<button
						type="button"
						class="btn btn-outline btn-sm shrink-0 gap-2"
						onclick={() => openSource(sourceUrl)}
					>
						<Icon icon="open_in_new" size="sm" />
						{sourceLabel}
					</button>
				{/if}
			</div>

			{#if meta.length > 0}
				<dl class="text-base-content/70 mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
					{#each meta as item (item.label)}
						<div class="flex min-w-0 gap-2">
							<dt class="text-base-content/45">{item.label}</dt>
							<dd class="max-w-72 truncate font-medium">{item.value}</dd>
						</div>
					{/each}
				</dl>
			{/if}
		</header>

		{@render children()}
	</div>
</article>
