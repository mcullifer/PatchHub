<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import type { Snippet } from 'svelte';

	let {
		title,
		sourceLabel,
		sourceUrl = null,
		badges,
		children
	}: {
		title: string;
		sourceLabel: string;
		sourceUrl?: string | null;
		badges: Snippet;
		children: Snippet;
	} = $props();

	function openSource(url: string): void {
		window.open(url, '_blank', 'noopener,noreferrer');
	}
</script>

<article class="card bg-base-200 border-base-300 border shadow-sm">
	<div class="card-body gap-6 p-4 sm:p-6 lg:p-8">
		<header class="border-base-300 border-b pb-6">
			<div class="mb-3 flex flex-wrap items-center gap-2">
				{@render badges()}
			</div>

			<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<h2 class="max-w-4xl text-2xl leading-tight font-bold text-pretty md:text-4xl">
					{title}
				</h2>
				{#if sourceUrl}
					<button
						type="button"
						class="btn btn-primary btn-sm shrink-0 gap-2"
						onclick={() => openSource(sourceUrl)}
					>
						<Icon icon="open_in_new" size="sm" />
						{sourceLabel}
					</button>
				{/if}
			</div>
		</header>

		{@render children()}
	</div>
</article>
