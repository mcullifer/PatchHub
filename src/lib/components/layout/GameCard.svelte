<script lang="ts">
	import { resolve } from '$app/paths';
	import { FavoriteHeart, Icon, MediaCard } from '$lib/components/common-ui';
	import { Tooltip } from '$lib/components/common-ui/floating';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import { useFavorites } from '$lib/contexts/favorites.svelte';
	import type { IPopularSteamGame } from '$lib/models/Steam';
	import { getSteamHeaderImage } from '$lib/remote/games.remote';
	import { getDefaultSteamHeaderImageUrl, getSteamLibraryHeroUrl } from '$lib/util/SteamAssets';
	import { getSteamGamePath } from '$lib/util/SteamRoute';

	let { game, featured = false }: { game: IPopularSteamGame; featured?: boolean } = $props();

	const currentUser = getCurrentUser();
	const favorites = useFavorites();
	let defaultHeaderImageUrl = $derived(
		featured ? getSteamLibraryHeroUrl(game.appid) : getDefaultSteamHeaderImageUrl(game.appid)
	);
	let resolvedHeaderImage = $state<{ appid: number; url: string } | null>(null);
	let loadedHeaderImage = $state<{ appid: number; url: string } | null>(null);
	let failedHeaderImage = $state<{ appid: number; url: string } | null>(null);
	let triedResolvedHeaderImageAppId = $state<number | null>(null);
	let placeholderImageAppId = $state<number | null>(null);
	let imageSrc = $derived(
		resolvedHeaderImage?.appid === game.appid ? resolvedHeaderImage.url : defaultHeaderImageUrl
	);
	let imageLoaded = $derived(
		loadedHeaderImage?.appid === game.appid && loadedHeaderImage.url === imageSrc
	);
	let imageFailed = $derived(
		failedHeaderImage?.appid === game.appid && failedHeaderImage.url === imageSrc
	);
	let showImagePlaceholder = $derived(placeholderImageAppId === game.appid);

	let steamPath = $derived(getSteamGamePath(game));
	async function resolveHeaderImage(): Promise<void> {
		const appid = game.appid;
		const failedImageSrc = imageSrc;
		failedHeaderImage = { appid, url: failedImageSrc };

		if (triedResolvedHeaderImageAppId === appid) {
			placeholderImageAppId = appid;
			return;
		}

		triedResolvedHeaderImageAppId = appid;

		try {
			const headerImageUrl = await getSteamHeaderImage(appid);
			if (!headerImageUrl || headerImageUrl === failedImageSrc) {
				placeholderImageAppId = appid;
				return;
			}

			resolvedHeaderImage = { appid, url: headerImageUrl };
		} catch {
			placeholderImageAppId = appid;
		}
	}

	let favorited = $derived(favorites.isExternalItemFavorited(game.externalItemId));
</script>

<MediaCard
	href={resolve(steamPath as `/${string}/${string}/${string}`)}
	title={game.name}
	actionLabel="Patch notes"
	size={featured ? 'lg' : 'md'}
	class={featured ? 'h-56 sm:h-72 lg:h-80' : 'aspect-[460/215]'}
>
	{#snippet media()}
		{#if showImagePlaceholder}
			<div class="grid h-full w-full place-items-center">
				<Icon icon="sports_esports" size="xl" class="text-base-content/30" />
			</div>
		{:else}
			{#if !imageLoaded}
				<div class="skeleton absolute inset-0 rounded-none"></div>
			{/if}
			{#if imageSrc}
				<img
					class={['h-full w-full object-cover', imageFailed && 'invisible']}
					src={imageSrc}
					alt=""
					onload={() => (loadedHeaderImage = { appid: game.appid, url: imageSrc })}
					onerror={resolveHeaderImage}
				/>
			{/if}
		{/if}
	{/snippet}

	{#snippet topLeft()}
		{#if featured}
			<span class="badge badge-primary gap-1 font-semibold">
				<Icon icon="trending_up" size="xs" />
				Most played
			</span>
		{/if}
	{/snippet}

	{#snippet topRight()}
		{#if currentUser() !== null}
			<Tooltip>
				{#snippet reference(floating)}
					<FavoriteHeart
						{favorited}
						onToggle={() => favorites.toggleExternalItem(game.externalItemId)}
						{...floating.reference({ class: ['btn-sm'] })}
					/>
				{/snippet}
				<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm font-normal">
					Favorite
				</div>
			</Tooltip>
		{/if}
	{/snippet}

	{#snippet meta()}
		<span class="inline-flex items-center gap-1 text-sm opacity-90">
			<Icon icon="person" size="xs" class="-ml-px" />
			{game.concurrent_in_game.toLocaleString()}
		</span>
		<span class="text-success text-sm opacity-90">• online</span>
	{/snippet}
</MediaCard>
