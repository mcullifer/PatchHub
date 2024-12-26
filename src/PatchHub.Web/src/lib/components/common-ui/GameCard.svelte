<script lang="ts">
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import Label from '$lib/components/common-ui/Label.svelte';
	import type { IRankedSteamGame } from '$lib/models/Steam';

	let { game }: { game: IRankedSteamGame } = $props();

	function getImgForGame(appId: number) {
		return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
	}
</script>

<div class="card card-bordered bg-base-100 shadow-lg dark:border-neutral dark:bg-base-300">
	<figure>
		<a href={`/game/${game.appid}`}>
			<img
				class="w-full duration-500 hover:scale-125"
				src={getImgForGame(game.appid)}
				alt={game.appid.toString()}
			/>
		</a>
	</figure>
	<div class="card-body w-full">
		<div class="flex justify-between">
			<a href={`/game/${game.appid}`} class="link-hover link card-title">{game.name}</a>
			<label class="swap">
				<input type="checkbox" data-tip="Favorite" class="tooltip" />
				<Icon icon="favorite" style="outlined" class="swap-off " />
				<Icon icon="favorite" class="swap-on text-pink-500" />
			</label>
		</div>
		<div class="flex items-center gap-2">
			<Label
				class="font-medium"
				iconSize="sm"
				icon="person"
				text={game.concurrent_in_game.toLocaleString()}
			/>
			<span class="text-success">• online</span>
		</div>
	</div>
</div>
