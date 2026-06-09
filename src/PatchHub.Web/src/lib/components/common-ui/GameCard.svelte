<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Card, Icon, Label } from '$lib/components/common-ui';
	import type { INamedSteamGame } from '$lib/models/Steam';
	import { getSteamHeaderImage } from '$lib/remote/games.remote';
	import { getSteamGamePath } from '$lib/util/SteamRoute';

	let { game, isFavorited }: { game: INamedSteamGame; isFavorited: boolean } = $props();

	let defaultHeaderImageUrl = $derived(getDefaultHeaderImageUrl(game.appid));
	let imageSrc = $state('');
	let triedResolvedHeaderImage = $state(false);
	let showImagePlaceholder = $state(false);

	function getDefaultHeaderImageUrl(appId: number): string {
		return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
	}

	let steamPath = $derived(getSteamGamePath(game));

	$effect(() => {
		imageSrc = defaultHeaderImageUrl;
		triedResolvedHeaderImage = false;
		showImagePlaceholder = false;
	});

	async function resolveHeaderImage(): Promise<void> {
		if (triedResolvedHeaderImage) {
			showImagePlaceholder = true;
			return;
		}

		triedResolvedHeaderImage = true;

		try {
			const headerImageUrl = await getSteamHeaderImage(game.appid);
			if (!headerImageUrl || headerImageUrl === imageSrc) {
				showImagePlaceholder = true;
				return;
			}

			imageSrc = headerImageUrl;
		} catch {
			showImagePlaceholder = true;
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
		>
			{#if showImagePlaceholder}
				<div class="bg-base-300 flex aspect-[460/215] w-full items-center justify-center">
					<Icon icon="sports_esports" size="xl" class="text-base-content/30" />
				</div>
			{:else}
				<img
					class="aspect-[460/215] w-full object-cover duration-500 hover:scale-125"
					src={imageSrc}
					alt=""
					onerror={resolveHeaderImage}
				/>
			{/if}
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
