<script lang="ts">
	import { Button, Icon, VisibleWhenInView } from '$lib/components/common-ui';
	import type { INamedSteamGame } from '$lib/models/Steam';
	import { getTopGames } from '$lib/remote/topgames.remote';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	type TopGameSectionProps = {
		item: Snippet<[INamedSteamGame]>;
		class?: ClassValue;
	};
	let { item, class: classNames = '' }: TopGameSectionProps = $props();
	let inview = $state<ReturnType<typeof VisibleWhenInView>>();
	let showMore = $state(false);
</script>

<section class={classNames}>
	<div class="mb-6">
		<div class="border-base-content/10 flex items-end justify-between border-b pb-4">
			<div>
				<h2 class="mb-1 flex items-center gap-3 text-2xl font-bold">
					<Icon icon="sports_esports" size="md" />
					<span>Games</span>
				</h2>
				<p class="text-base-content/50 text-sm">Latest patches and updates</p>
			</div>
			<div class="badge badge-ghost badge-lg gap-2">
				<Icon icon="trending_up" size="xs" />
				Trending
			</div>
		</div>
	</div>
	<div class="gap-4 max-sm:flex max-sm:flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3">
		{#await getTopGames()}
			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
			{#each Array(6) as _, i (i)}
				<div class="skeleton h-full w-full"></div>
			{/each}
		{:then games}
			<VisibleWhenInView
				bind:this={inview}
				items={games}
				visibleOnStart={6}
				increment={10}
				opts={{ immediate: false }}
			>
				{#snippet template(game)}
					{@render item(game)}
				{/snippet}
			</VisibleWhenInView>
		{/await}
	</div>
	{#if !showMore}
		<div class="mt-8 flex w-full justify-center">
			<Button
				text="Show more games"
				class="btn btn-outline btn-sm gap-2"
				onclick={() => {
					showMore = true;
					inview?.resume();
				}}
			>
				<Icon icon="expand_more" size="xs" />
			</Button>
		</div>
	{/if}
</section>
