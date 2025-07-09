<script lang="ts">
	import { GameCard } from '$lib/components/common-ui';
	import TopGamesSection from '$lib/components/layout/TopGamesSection.svelte';
	import TopSoftwareSection from '$lib/components/layout/TopSoftwareSection.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const isFavorited = (gameId: number) => {
		return data.favorites.find((f) => parseInt(f.externalId ?? '0') === gameId) ? true : false;
	};
</script>

<svelte:head>
	<title>PatchHub</title>
</svelte:head>

<div class="m-4 mx-auto w-full max-w-7xl space-y-2 px-2">
	<TopGamesSection games={data.topGames}>
		{#snippet item(game)}
			<GameCard {game} isFavorited={isFavorited(game.appid)} />
		{/snippet}
	</TopGamesSection>
	<TopSoftwareSection />
</div>
