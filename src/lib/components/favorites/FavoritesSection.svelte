<script lang="ts">
	import { EmptyState, Icon } from '$lib/components/common-ui';
	import SectionHeader from '$lib/components/layout/SectionHeader.svelte';
	import { useFavorites } from '$lib/contexts/favorites.svelte';
	import { getSearchPalette } from '$lib/contexts/searchPalette';
	import FavoriteCard from './FavoriteCard.svelte';

	const favorites = useFavorites();
	const searchPalette = getSearchPalette();
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
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each favorites.items as item (item.id)}
				<FavoriteCard {item} />
			{/each}
			{#if favorites.items.length < 3}
				<button
					type="button"
					onclick={() => searchPalette.open()}
					class="card bg-base-200 ring-base-content/10 hover:bg-base-300 grid aspect-[460/215] cursor-pointer place-items-center ring-1 transition-colors"
				>
					<span class="flex max-w-xs flex-col items-center gap-1 px-4 text-center">
						<Icon icon="favorite" size="lg" class="text-base-content/25" />
						<span class="font-semibold">Find something to follow</span>
						<span class="text-base-content/60 text-sm">
							Hit the heart on any game or app to keep it here.
						</span>
					</span>
				</button>
			{/if}
		</div>
	{/if}
</section>
