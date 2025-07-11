<script lang="ts">
	import { Button, Icon, InView } from '$lib/components/common-ui';
	import type { INamedSteamGame } from '$lib/models/Steam';
	import type { Snippet } from 'svelte';
	import type { ObserverEventDetails } from 'svelte-inview';
	import type { ClassValue } from 'svelte/elements';

	type TopGameSectionProps = {
		games: INamedSteamGame[];
		item: Snippet<[INamedSteamGame]>;
		class?: ClassValue;
	};
	let { games, item, class: classNames = '' }: TopGameSectionProps = $props();
	let maxVisible = $state(6);
	let visibleGames = $derived(games.slice(0, maxVisible));
	let showMore = $state(false);

	function onInviewChange(e: CustomEvent<ObserverEventDetails>) {
		if (maxVisible >= games.length) {
			e.detail.observer.disconnect();
		}
		maxVisible += 10;
	}
</script>

<section class={['prose max-w-none', classNames]}>
	<h2 class="flex items-center gap-2">
		<Icon icon="sports_esports" />
		Games
	</h2>
	<div class="not-prose gap-4 max-sm:flex max-sm:flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3">
		{#each visibleGames as game (game.appid)}
			{@render item(game)}
		{/each}
		{#if showMore}
			<InView opts={{ rootMargin: '50px' }} {onInviewChange} />
		{/if}
	</div>
	{#if !showMore}
		<div class="flex w-full justify-center py-4">
			<Button
				text="Show more"
				class="btn-primary btn-sm btn-wide"
				onclick={() => (showMore = true)}
			/>
		</div>
	{/if}
</section>
