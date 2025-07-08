<script lang="ts">
	import { Button, GameCard, Icon } from '$lib/components/common-ui';
	import type { ITopSteamGames } from '$lib/models/Steam';
	import type { Catalog } from '$lib/server/db/schema';
	import { inview } from 'svelte-inview';

	type TopGameSectionProps = {
		games: ITopSteamGames;
		favorites: Catalog[];
		class?: string;
	};
	let { games, favorites, class: classNames = '' }: TopGameSectionProps = $props();
	let maxVisible = $state(6);
	let visibleGames = $derived(games.ranks.slice(0, maxVisible));
	let showMore = $state(false);

	const isFavorited = (gameId: number) => {
		return favorites.find((f) => parseInt(f.externalId ?? '0') === gameId) ? true : false;
	};
</script>

<section class="prose max-w-none {classNames}">
	<h2 class="flex items-center gap-2">
		<Icon icon="sports_esports" />
		Games
	</h2>
	<div class="not-prose gap-4 max-sm:flex max-sm:flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3">
		{#each visibleGames as game (game.appid)}
			<GameCard {game} isFavorited={isFavorited(game.appid)} />
		{/each}
		{#if showMore}
			<div
				class="sentinel"
				use:inview={{
					rootMargin: '50px'
				}}
				oninview_change={(e) => {
					if (maxVisible >= games.ranks.length) {
						e.detail.observer.disconnect();
					}
					maxVisible += 10;
				}}
			></div>
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
