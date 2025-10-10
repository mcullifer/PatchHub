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

<section class={['prose max-w-none', classNames]}>
	<h2 class="flex items-center gap-2">
		<Icon icon="sports_esports" />
		Games
	</h2>
	<div class="not-prose gap-4 max-sm:flex max-sm:flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3">
		{#await getTopGames()}
			{#each { length: 6 } as n, i (i)}
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
		<div class="flex w-full justify-center py-4">
			<Button
				text="Show more"
				class="btn-primary btn-sm btn-wide"
				onclick={() => {
					showMore = true;
					inview?.resume();
				}}
			/>
		</div>
	{/if}
</section>
