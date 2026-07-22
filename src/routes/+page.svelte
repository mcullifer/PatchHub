<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { Card, GameCard, Icon } from '$lib/components/common-ui';
	import TopGamesSection from '$lib/components/layout/TopGamesSection.svelte';
	import TopSoftwareSection from '$lib/components/layout/TopSoftwareSection.svelte';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import { getFavorites } from '$lib/remote/favorites.remote';
	import { getMostPopularGames } from '$lib/remote/games.remote';

	const currentUser = getCurrentUser();
	const favorites = currentUser() ? await getFavorites() : { externalItems: [], projectIds: [] };
	const games = await getMostPopularGames();

	const isFavorited = (favorites: Awaited<ReturnType<typeof getFavorites>>, gameId: number) => {
		return (
			favorites.externalItems.some((f) => gameId.toString() === f.externalId) ||
			favorites.projectIds.some((id) => gameId.toString() === id.toString())
		);
	};
</script>

<Seo
	title="PatchHub — One place for updates"
	description="Follow patch notes for games and software, or publish updates for your own projects—all in one place."
/>

<svelte:head>
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebSite",
			"name": "PatchHub",
			"url": "https://patchhub.io/",
			"description": "One place to follow patch notes or publish updates for your own projects."
		}
	</script>
</svelte:head>

{#snippet cardFailed()}
	<Card class="bg-base-200 text-center">
		<Icon icon="error" class="text-error self-center pt-8" size="xl" />
		<p class="mt-2 text-sm opacity-70">Something went wrong</p>
	</Card>
{/snippet}

<div class="bg-base-200 relative overflow-hidden">
	<header class="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
		<h1 class="text-4xl font-bold tracking-tighter text-balance md:text-6xl">
			One place for <span class="text-primary">updates</span>
		</h1>
		<p class="text-base-content/60 mt-3 max-w-xl text-pretty sm:text-lg">
			Patch notes and release feeds for the games and software you follow.
		</p>
	</header>
</div>

<div class="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
	<TopGamesSection id="games" {games}>
		{#snippet item(game, featured)}
			<svelte:boundary>
				<GameCard {game} {featured} isFavorited={isFavorited(favorites, game.appid)} />
				{#snippet failed()}
					{@render cardFailed()}
				{/snippet}
			</svelte:boundary>
		{/snippet}
	</TopGamesSection>

	<TopSoftwareSection
		id="software"
		favoritedExternalItemIds={favorites.externalItems.map((item) => item.id)}
	/>
</div>
