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
</script>

<article class="card card-sm md:card-md bg-base-200">
	<div class="card-body gap-4 md:gap-6">
		<header class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
			<div class="min-w-0">
				<h2 class="text-2xl font-bold text-pretty lg:text-3xl">{title}</h2>
				{#if meta.length > 0}
					<dl class="text-base-content/60 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
						{#each meta as item (item.label)}
							<div class="flex gap-1.5">
								<dt>{item.label}</dt>
								<dd class="text-base-content/80 font-medium">{item.value}</dd>
							</div>
						{/each}
					</dl>
				{/if}
			</div>
			{#if sourceUrl}
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={sourceUrl}
					class="btn btn-sm btn-soft btn-primary"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icon icon="open_in_new" size="sm" />
					{sourceLabel}
				</a>
			{/if}
		</header>

		{@render children()}
	</div>
</article>
