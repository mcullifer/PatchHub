<script lang="ts">
	import { resolve } from '$app/paths';
	import { FavoriteHeart, Icon, MediaCard } from '$lib/components/common-ui';
	import { useFavorites } from '$lib/contexts/favorites.svelte';
	import type { FavoriteItem } from '$lib/remote/favorites.remote';
	import { getSteamGamePath } from '$lib/util/SteamRoute';

	let { item }: { item: FavoriteItem } = $props();

	const favorites = useFavorites();
	let imageFailed = $state(false);
	let path = $derived(getPath(item));

	function getPath(favorite: FavoriteItem): `/${string}` {
		switch (favorite.kind) {
			case 'game':
				return getSteamGamePath(favorite) as `/${string}`;
			case 'software':
				return `/software/${favorite.slug}`;
			case 'project':
				return `/${favorite.createdBy}/${favorite.slug}`;
		}
	}

	function toggle(): Promise<void> {
		return item.kind === 'project'
			? favorites.toggleProject(item.id)
			: favorites.toggleExternalItem(item.id);
	}
</script>

<MediaCard href={resolve(path)} title={item.name} class="aspect-[460/215]">
	{#snippet media()}
		{#if item.imageUrl && !imageFailed}
			<img
				class="h-full w-full object-cover"
				src={item.imageUrl}
				alt={item.imageAlt}
				loading="lazy"
				onerror={() => (imageFailed = true)}
			/>
		{:else}
			<div class="grid h-full w-full place-items-center">
				<Icon
					icon={item.kind === 'project' ? 'folder_open' : 'sports_esports'}
					size="xl"
					class="text-base-content/25"
				/>
			</div>
		{/if}
	{/snippet}

	{#snippet topRight()}
		<FavoriteHeart favorited onToggle={toggle} class="btn-sm" />
	{/snippet}
</MediaCard>
