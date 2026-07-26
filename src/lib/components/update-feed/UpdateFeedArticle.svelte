<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import type { Snippet } from 'svelte';
	import type { UpdateFeedBadge, UpdateFeedMetaItem } from './UpdateFeedTypes';

	let {
		title,
		sourceLabel,
		sourceUrl = null,
		badges = [],
		meta = [],
		children
	}: {
		title: string;
		sourceLabel: string;
		sourceUrl?: string | null;
		badges?: UpdateFeedBadge[];
		meta?: UpdateFeedMetaItem[];
		children: Snippet;
	} = $props();
</script>

<article class="card card-sm md:card-md bg-base-200 max-sm:rounded-none">
	<div class="card-body gap-4 md:gap-6">
		<header class="flex flex-col gap-2">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
				{#each badges as badge (badge.label)}
					<span
						class={[
							'badge badge-soft badge-sm',
							badge.tone === 'warning' ? 'badge-warning' : 'badge-info'
						]}
					>
						{badge.label}
					</span>
				{/each}
				{#if meta.length > 0}
					<dl class="text-base-content/60 flex flex-wrap gap-x-3 gap-y-1 text-sm">
						{#each meta as item (item.value)}
							<div class="flex gap-1.5">
								{#if item.label}
									<dt>{item.label}</dt>
								{/if}
								<dd class="text-base-content/80 font-medium">{item.value}</dd>
							</div>
						{/each}
					</dl>
				{/if}
				{#if sourceUrl}
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={sourceUrl}
						class="btn btn-sm btn-soft btn-primary sm:ml-auto"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon icon="open_in_new" size="sm" />
						{sourceLabel}
					</a>
				{/if}
			</div>
			<h2 class="max-w-[36ch] text-3xl font-bold text-balance">{title}</h2>
		</header>

		{@render children()}
	</div>
</article>
