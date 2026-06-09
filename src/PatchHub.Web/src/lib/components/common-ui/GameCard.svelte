<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Card, Icon, Label } from '$lib/components/common-ui';
	import type { INamedSteamGame } from '$lib/models/Steam';
	import { getSteamHeaderImage } from '$lib/remote/games.remote';
	import { getSteamGamePath } from '$lib/util/SteamRoute';

	let { game, isFavorited }: { game: INamedSteamGame; isFavorited: boolean } = $props();

	let defaultHeaderImageUrl = $derived(getDefaultHeaderImageUrl(game.appid));
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

	function getDefaultHeaderImageUrl(appId: number): string {
		return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
	}

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

	async function favoriteGame() {
		// // TODO: We need to get our actual catalog item for each game
		// let response = isFavorited
		// 	? api.favorites.remove(game.catalogId)
		// 	: api.favorites.add(game.catalogId);
		// isFavorited = !isFavorited;
		// if (!(await response).ok) {
		// 	isFavorited = !isFavorited;
		// }
	}
</script>

<Card class="card-border card-sm border-base-content/20 bg-base-200 shadow-md">
	{#snippet figure()}
		<a
			data-sveltekit-preload-data="off"
			href={resolve(steamPath as `/${string}/${string}/${string}`)}
			class="block w-full overflow-hidden"
		>
			<div
				class="bg-base-300 relative flex aspect-[460/215] w-full items-center justify-center overflow-hidden"
			>
				{#if showImagePlaceholder}
					<Icon icon="sports_esports" size="xl" class="text-base-content/30" />
				{:else}
					{#if !imageLoaded}
						<div class="skeleton absolute inset-0 rounded-none"></div>
					{/if}
					{#if imageSrc}
						<img
							class={[
								'absolute inset-0 h-full w-full object-cover hover:scale-125',
								!imageLoaded && 'invisible'
							]}
							src={imageSrc}
							alt=""
							onload={() => (loadedHeaderImage = { appid: game.appid, url: imageSrc })}
							onerror={resolveHeaderImage}
						/>
					{/if}
				{/if}
			</div>
		</a>
	{/snippet}
	{#snippet title()}
		<div class="flex w-full justify-between">
			<a
				data-sveltekit-preload-data="off"
				href={resolve(steamPath as `/${string}/${string}/${string}`)}
				class="link-hover link"
			>
				{game.name}
			</a>
			{#if page.data.user !== null}
				<label class="swap">
					<input
						type="checkbox"
						data-tip="Favorite"
						class="tooltip"
						checked={isFavorited}
						onchange={async () => await favoriteGame()}
					/>
					<Icon icon="favorite" style="outlined" class="swap-off" />
					<Icon icon="favorite" class="swap-on text-pink-500" />
				</label>
			{/if}
		</div>
	{/snippet}

	<div class="prose flex items-center gap-2">
		<Label
			class="opacity-80"
			iconSize="sm"
			icon="person"
			text={game.concurrent_in_game.toLocaleString()}
		/>
		<span class="text-success">• online</span>
	</div>
</Card>
