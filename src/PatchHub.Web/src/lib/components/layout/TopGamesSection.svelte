<script lang="ts">
	import GameCard from '$lib/components/common-ui/GameCard.svelte';
	import type { ITopSteamGames } from '$lib/models/Steam';
	import { inview } from 'svelte-inview';

	type TopGameSectionProps = {
		games: ITopSteamGames;
		class?: string;
	};

	let { games, class: classNames = '' }: TopGameSectionProps = $props();
	let maxVisible = $state(10);
	let visibleGames = $derived(games.ranks.slice(0, maxVisible));
</script>

<section class="prose max-w-none {classNames}">
	<h2>Top Games</h2>
	<div class="not-prose gap-4 max-sm:flex max-sm:flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3">
		{#each visibleGames as game}
			<GameCard {game} />
		{/each}
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
	</div>
</section>
