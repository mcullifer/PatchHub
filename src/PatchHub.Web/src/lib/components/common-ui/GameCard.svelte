<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Card, Icon, Label } from '$lib/components/common-ui';
	import type { INamedSteamGame } from '$lib/models/Steam';
	import { normalizeName } from '$lib/util/StringUtils';

	let { game, isFavorited }: { game: INamedSteamGame; isFavorited: boolean } = $props();

	function getImgForGame(appId: number) {
		return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
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

<Card class="card-border bg-base-300 shadow-lg">
	{#snippet figure()}
		<a data-sveltekit-preload-data="off" href={resolve(`/${'steam'}/${normalizeName(game.name)}`)}>
			<img
				class="w-full duration-500 hover:scale-125"
				src={getImgForGame(game.appid)}
				alt={game.appid.toString()}
			/>
		</a>
	{/snippet}
	{#snippet title()}
		<div class="flex w-full justify-between">
			<a
				data-sveltekit-preload-data="off"
				href={resolve(`/${'steam'}/${normalizeName(game.name)}`)}
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
			class="font-medium"
			iconSize="sm"
			icon="person"
			text={game.concurrent_in_game.toLocaleString()}
		/>
		<span class="text-success">• online</span>
	</div>
</Card>
