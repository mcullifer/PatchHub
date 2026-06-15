<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { UpdateFeedStat } from './UpdateFeedTypes';

	let {
		title,
		description,
		imageUrl = null,
		imageAlt = '',
		onimageerror,
		fallbackIcon,
		stats = []
	}: {
		title: string;
		description: string;
		imageUrl?: string | null;
		imageAlt?: string;
		onimageerror?: () => void;
		fallbackIcon: Snippet;
		stats?: UpdateFeedStat[];
	} = $props();
</script>

<header class="card bg-base-200 border-base-300 overflow-hidden border">
	<div class="grid min-h-72 gap-0 lg:grid-cols-[minmax(360px,50%)_minmax(0,50%)]">
		<figure class="bg-base-300 relative min-h-56 overflow-hidden lg:min-h-full">
			{#if imageUrl}
				<img
					class="h-full w-full object-cover"
					src={imageUrl}
					alt={imageAlt}
					loading="lazy"
					onerror={onimageerror}
				/>
			{:else}
				<div class="flex h-full min-h-56 items-center justify-center">
					{@render fallbackIcon()}
				</div>
			{/if}
			<div
				class="from-base-200/0 from-[50%] via-base-200/65 via-[78%] to-base-200 pointer-events-none absolute inset-0 bg-gradient-to-b lg:from-[42%] lg:via-[76%] lg:bg-gradient-to-r"
			></div>
		</figure>

		<div class="card-body justify-center gap-5 p-4 sm:p-6 lg:p-8">
			<div class="max-w-3xl">
				<h1 class="text-2xl leading-tight font-bold text-pretty md:text-3xl">
					{title}
				</h1>
				<p class="text-base-content/70 mt-2 max-w-2xl text-sm leading-6">
					{description}
				</p>
			</div>

			{#if stats.length > 0}
				<dl class="border-base-300 grid gap-4 border-t pt-4 sm:grid-cols-3">
					{#each stats as stat (stat.label)}
						<div class="min-w-0">
							<dt class="text-base-content/50 text-xs font-medium tracking-wide uppercase">
								{stat.label}
							</dt>
							<dd class="mt-1 truncate text-sm font-medium">{stat.value}</dd>
						</div>
					{/each}
				</dl>
			{/if}
		</div>
	</div>
</header>
