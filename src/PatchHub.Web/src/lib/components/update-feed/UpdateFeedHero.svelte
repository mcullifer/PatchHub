<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		imageUrl = null,
		imageAlt = '',
		onimageerror,
		fallbackIcon,
		stats = [],
		badges
	}: {
		title: string;
		description: string;
		imageUrl?: string | null;
		imageAlt?: string;
		onimageerror?: () => void;
		fallbackIcon: Snippet;
		stats?: { label: string; value: string | number }[];
		badges: Snippet;
	} = $props();
</script>

<header class="card bg-base-200 border-base-300 overflow-hidden border shadow-sm">
	<div class="relative grid min-h-72 gap-0 lg:grid-cols-[minmax(320px,45%)_minmax(0,55%)]">
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
				class="from-base-200/0 via-base-200/30 to-base-200 absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r"
			></div>
		</figure>

		<div class="card-body relative z-10 gap-5 p-4 sm:p-6 lg:p-8">
			<div class="flex flex-wrap items-center gap-2">
				{@render badges()}
			</div>

			<div class="max-w-3xl">
				<h1 class="text-2xl leading-tight font-bold text-pretty md:text-3xl">
					{title}
				</h1>
				<p class="text-base-content/80 mt-2 max-w-2xl text-sm">
					{description}
				</p>
			</div>

			{#if stats.length > 0}
				<div
					class="stats stats-vertical bg-base-100 border-base-300 sm:stats-horizontal w-full border shadow-sm"
				>
					{#each stats as stat (stat.label)}
						<div class="stat px-4 py-3">
							<div class="stat-title">{stat.label}</div>
							<div class="stat-value text-lg">{stat.value}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</header>
