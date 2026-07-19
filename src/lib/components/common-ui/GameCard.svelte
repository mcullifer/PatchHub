<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { FavoriteHeart, Icon } from '$lib/components/common-ui';
	import { Tooltip } from '$lib/components/common-ui/floating';
	import type { INamedSteamGame } from '$lib/models/Steam';
	import {
		addExternalItemFavorite,
		removeExternalItemFavorite
	} from '$lib/remote/favorites.remote';
	import { getSteamHeaderImage } from '$lib/remote/games.remote';
	import { getDefaultSteamHeaderImageUrl, getSteamLibraryHeroUrl } from '$lib/util/SteamAssets';
	import { getSteamGamePath } from '$lib/util/SteamRoute';

	let {
		game,
		isFavorited,
		featured = false
	}: { game: INamedSteamGame; isFavorited: boolean; featured?: boolean } = $props();

	let defaultHeaderImageUrl = $derived(
		featured ? getSteamLibraryHeroUrl(game.appid) : getDefaultSteamHeaderImageUrl(game.appid)
	);
	let resolvedHeaderImage = $state<{ appid: number; url: string } | null>(null);
	let loadedHeaderImage = $state<{ appid: number; url: string } | null>(null);
	let triedResolvedHeaderImageAppId = $state<number | null>(null);
	let placeholderImageAppId = $state<number | null>(null);
	let imageSrc = $derived(
		resolvedHeaderImage?.appid === game.appid ? resolvedHeaderImage.url : defaultHeaderImageUrl
	);
	let imageLoaded = $derived(
		loadedHeaderImage?.appid === game.appid && loadedHeaderImage.url === imageSrc
	);
	let showImagePlaceholder = $derived(placeholderImageAppId === game.appid);

	let steamPath = $derived(getSteamGamePath(game));
	async function resolveHeaderImage(): Promise<void> {
		const appid = game.appid;
		const failedImageSrc = imageSrc;

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

	let optimisticFavorited = $state<boolean | null>(null);
	let favorited = $derived(optimisticFavorited ?? isFavorited);

	let isTogglingFavorite = false;

	async function toggleFavorite() {
		const externalItemId = game.externalItemId;
		if (!externalItemId || isTogglingFavorite) return;
		isTogglingFavorite = true;

		const next = !favorited;
		optimisticFavorited = next;
		try {
			await (next
				? addExternalItemFavorite(externalItemId)
				: removeExternalItemFavorite(externalItemId));
		} catch {
			optimisticFavorited = !next;
		} finally {
			isTogglingFavorite = false;
		}
	}
</script>

<div
	class={[
		'group bg-base-300 rounded-box ring-base-content/20 relative overflow-hidden shadow-md ring-1',
		featured ? 'h-56 sm:h-72 lg:h-80' : 'aspect-[460/215]'
	]}
>
	{#if showImagePlaceholder}
		<div class="absolute inset-0 grid place-items-center">
			<Icon icon="sports_esports" size="xl" class="text-base-content/30" />
		</div>
	{:else}
		{#if !imageLoaded}
			<div class="skeleton absolute inset-0 rounded-none"></div>
		{/if}
		{#if imageSrc}
			<img
				class={[
					'absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:duration-[350ms] motion-reduce:group-hover:scale-100',
					featured ? 'group-hover:scale-[1.025]' : 'group-hover:scale-[1.04]',
					!imageLoaded && 'invisible'
				]}
				src={imageSrc}
				alt=""
				onload={() => (loadedHeaderImage = { appid: game.appid, url: imageSrc })}
				onerror={resolveHeaderImage}
			/>
		{/if}
	{/if}

	<div
		class="from-neutral via-neutral/40 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent"
	></div>

	<a
		data-sveltekit-preload-data="off"
		href={resolve(steamPath as `/${string}/${string}/${string}`)}
		class="rounded-box focus-visible:ring-primary absolute inset-0 focus-visible:ring-2 focus-visible:outline-none"
		aria-label={game.name}
	></a>

	{#if featured}
		<span class="badge badge-primary pointer-events-none absolute top-4 left-4 gap-1 font-semibold">
			<Icon icon="trending_up" size="xs" />
			Most played
		</span>
	{:else}
		<span
			class="badge badge-neutral badge-sm pointer-events-none absolute top-2 left-2 font-semibold"
		>
			#{game.rank}
		</span>
	{/if}

	{#if page.data.user !== null && game.externalItemId}
		<Tooltip>
			{#snippet reference(floating)}
				<FavoriteHeart
					{favorited}
					onToggle={toggleFavorite}
					{...floating.reference({
						class: ['bg-neutral/50 text-neutral-content absolute top-2 right-2 rounded-full p-1']
					})}
				/>
			{/snippet}
			<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm font-normal">Favorite</div>
		</Tooltip>
	{/if}

	<span
		class="badge badge-primary badge-sm pointer-events-none absolute right-4 bottom-4 translate-y-1 gap-1 opacity-0 transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:translate-y-0"
	>
		Patch notes
		<Icon icon="arrow_forward" size="xs" />
	</span>

	<div
		class="text-neutral-content pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4"
	>
		<h3 class={['leading-tight font-semibold', featured ? 'text-2xl sm:text-3xl' : 'text-base']}>
			{game.name}
		</h3>
		<div class="flex items-center gap-2 text-sm opacity-90">
			<span class="inline-flex items-center gap-1">
				<Icon icon="person" size="xs" />
				{game.concurrent_in_game.toLocaleString()}
			</span>
			<span class="text-success">• online</span>
		</div>
	</div>
</div>
