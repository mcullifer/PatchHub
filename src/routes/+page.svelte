<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { Card, GameCard, Icon } from '$lib/components/common-ui';
	import TopGamesSection from '$lib/components/layout/TopGamesSection.svelte';
	import TopSoftwareSection from '$lib/components/layout/TopSoftwareSection.svelte';
	import { getFavorites } from '$lib/remote/favorites.remote';

	const favorites = await getFavorites();

	const isFavorited = (favorites: Awaited<ReturnType<typeof getFavorites>>, gameId: number) => {
		return (
			favorites.externalItems.some((f) => gameId.toString() === f.externalId) ||
			favorites.projects.some((f) => gameId.toString() === f.id.toString())
		);
	};
</script>

<Seo
	title="PatchHub"
	description="Follow the games and software you love and never miss a patch note, update, or announcement."
/>

<div class="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
	<TopGamesSection>
		{#snippet item(game, featured)}
			<svelte:boundary>
				<GameCard {game} {featured} isFavorited={isFavorited(favorites, game.appid)} />
				{#snippet failed()}
					<Card class="bg-base-200 text-center">
						<Icon icon="error" class="text-error self-center pt-8" size="xl" />
						<p class="mt-2 text-sm opacity-70">Something went wrong</p>
					</Card>
				{/snippet}
			</svelte:boundary>
		{/snippet}
	</TopGamesSection>

	<TopSoftwareSection favoritedExternalItemIds={favorites.externalItems.map((item) => item.id)} />
</div>
