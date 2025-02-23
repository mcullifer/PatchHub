<script lang="ts">
	import Card from '$lib/components/common-ui/Card.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import Label from '$lib/components/common-ui/Label.svelte';
	import type { IRankedSteamGame } from '$lib/models/Steam';
	import { normalizeGameName } from '$lib/util/StringUtils';

	let { game }: { game: IRankedSteamGame } = $props();

	function getImgForGame(appId: number) {
		return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
	}
</script>

<Card class="card-bordered bg-base-100 dark:border-neutral dark:bg-base-300 shadow-lg">
	{#snippet figure()}
		<a href={`/${'steam'}/${normalizeGameName(game.name)}`}>
			<img
				class="w-full duration-500 hover:scale-125"
				src={getImgForGame(game.appid)}
				alt={game.appid.toString()}
			/>
		</a>
	{/snippet}
	{#snippet title()}
		<div class="flex w-full justify-between">
			<a href={`/${'steam'}/${normalizeGameName(game.name)}`} class="link-hover link">
				{game.name}
			</a>
			<label class="swap">
				<input type="checkbox" data-tip="Favorite" class="tooltip" />
				<Icon icon="favorite" style="outlined" class="swap-off " />
				<Icon icon="favorite" class="swap-on text-pink-500" />
			</label>
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
