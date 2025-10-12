<script lang="ts">
	import { Card, GameCard, Icon } from '$lib/components/common-ui';
	import TopGamesSection from '$lib/components/layout/TopGamesSection.svelte';
	import TopSoftwareSection from '$lib/components/layout/TopSoftwareSection.svelte';
	import { getFavorites } from '$lib/remote/favorites.remote';

	const favorites = getFavorites();

	const isFavorited = (gameId: number) => {
		if (!favorites.current) return false;
		return favorites.current.some((f) => gameId.toString() === f.externalId);
	};
</script>

<svelte:head>
	<title>PatchHub</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-16 px-4 py-8 sm:px-6 lg:px-8">
	<TopGamesSection>
		{#snippet item(game)}
			<svelte:boundary>
				<GameCard {game} isFavorited={isFavorited(game.appid)} />
				{#snippet failed()}
					<Card class="bg-base-200 text-center">
						<Icon icon="error" class="text-error self-center pt-8" size="xl" />
						<p class="mt-2 text-sm opacity-70">Something went wrong</p>
					</Card>
				{/snippet}
			</svelte:boundary>
		{/snippet}
	</TopGamesSection>

	<TopSoftwareSection />
</div>
