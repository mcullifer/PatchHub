<script lang="ts">
	import { resolve } from '$app/paths';
	import { FavoriteHeart, Icon } from '$lib/components/common-ui';
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

<article
	class="card bg-base-300 ring-base-content/20 group relative aspect-[460/215] overflow-hidden shadow-md ring-1"
>
	{#if item.imageUrl && !imageFailed}
		<img
			class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.04] group-hover:duration-[350ms] motion-reduce:group-hover:scale-100"
			src={item.imageUrl}
			alt={item.imageAlt}
			loading="lazy"
			onerror={() => (imageFailed = true)}
		/>
	{:else}
		<div class="absolute inset-0 grid place-items-center">
			<Icon
				icon={item.kind === 'project' ? 'folder_open' : 'sports_esports'}
				size="xl"
				class="text-base-content/25"
			/>
		</div>
	{/if}

	<div
		class="from-neutral via-neutral/40 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent"
	></div>

	<a
		data-sveltekit-preload-data="off"
		href={resolve(path)}
		class="focus-visible:ring-primary absolute inset-0 rounded-[inherit] focus-visible:ring-2 focus-visible:outline-none"
		aria-label={item.name}
	></a>

	<FavoriteHeart favorited onToggle={toggle} class="btn-sm absolute top-2 right-2" />

	<div class="text-neutral-content pointer-events-none absolute inset-x-0 bottom-0 p-4">
		<h3 class="text-base leading-tight font-semibold">{item.name}</h3>
	</div>
</article>
