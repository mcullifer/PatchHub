<script lang="ts">
	import { page } from '$app/state';
	import { Card, Icon, Label } from '$lib/components/common-ui';
	import { getApiContext } from '$lib/contexts/ApiContext.svelte';
	import type { IRankedSteamGame } from '$lib/models/Steam';
	import { normalizeName } from '$lib/util/StringUtils';

	let { game, isFavorited }: { game: IRankedSteamGame; isFavorited: boolean } = $props();

	const api = getApiContext();

	function getImgForGame(appId: number) {
		return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
	}

	async function favoriteGame() {
		if (isFavorited) {
			await api.favorites.remove(game.catalogId);
			isFavorited = false;
		} else {
			const response = await fetch('/api/favorites', {
				method: 'POST',
				body: JSON.stringify({ catalogId: game.catalogId })
			});
			if (response.ok) {
				isFavorited = true;
			}
		}
	}
</script>

<Card class="card-border bg-base-300 shadow-lg">
	{#snippet figure()}
		<a href={`/${'steam'}/${normalizeName(game.name)}`}>
			<img
				class="w-full duration-500 hover:scale-125"
				src={getImgForGame(game.appid)}
				alt={game.appid.toString()}
			/>
		</a>
	{/snippet}
	{#snippet title()}
		<div class="flex w-full justify-between">
			<a href={`/${'steam'}/${normalizeName(game.name)}`} class="link-hover link">
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
	<div class="flex items-center gap-2">
		<Label
			class="font-medium"
			iconSize="sm"
			icon="person"
			text={game.concurrent_in_game.toLocaleString()}
		/>
		<span class="text-success">• online</span>
	</div>
</Card>
