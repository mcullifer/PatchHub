<script lang="ts">
	import { EmptyState, Icon } from '$lib/components/common-ui';
	import SectionHeader from '$lib/components/layout/SectionHeader.svelte';
	import { useFavorites } from '$lib/contexts/favorites.svelte';
	import FavoriteCard from './FavoriteCard.svelte';

	const favorites = useFavorites();
</script>

<section>
	<SectionHeader title="Favorites">
		{#snippet attribution()}
			<Icon icon="favorite" size="xs" />
			Saved for you
		{/snippet}
	</SectionHeader>

	{#if favorites.loading}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each [1, 2, 3] as placeholder (placeholder)}
				<div class="skeleton aspect-[460/215]"></div>
			{/each}
		</div>
	{:else if favorites.failed}
		<EmptyState
			icon="error"
			title="Favorites unavailable"
			description="We couldn't load your favorites. Try again in a moment."
		>
			<button type="button" class="btn btn-primary btn-sm" onclick={() => favorites.retry()}>
				Try again
			</button>
		</EmptyState>
	{:else if favorites.items.length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each favorites.items as item (item.id)}
				<FavoriteCard {item} />
			{/each}
		</div>
	{:else}
		<EmptyState
			icon="favorite"
			title="No favorites yet"
			description="Use the heart button on games, software, and projects to keep them here at the top of your home page."
		/>
	{/if}
</section>
