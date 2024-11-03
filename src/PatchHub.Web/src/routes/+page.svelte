<script lang="ts">
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import Label from '$lib/components/common-ui/Label.svelte';
	import type { IRankedSteamGame } from '$lib/models/Steam';
	import { inview } from 'svelte-inview';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let maxVisible = $state(10);
	let visibleGames = $derived(data.ranks.slice(0, maxVisible));

	function getImgForGame(appId: number) {
		return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
	}
</script>

{#snippet gameCard(game: IRankedSteamGame, index: number)}
	<div class="card bg-base-300 shadow-xl">
		<figure>
			<img
				class="duration-500 hover:scale-125"
				src={getImgForGame(game.appid)}
				alt={game.appid.toString()}
			/>
		</figure>
		<div class="card-body">
			<div class="flex justify-between">
				<p class="card-title">{game.name}</p>
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
{/snippet}

<div class="mx-auto mt-4 grid max-w-xl grid-cols-2 gap-4 md:max-w-7xl md:grid-cols-3">
	{#each visibleGames as game, i}
		{@render gameCard(game, i)}
	{/each}
	<div
		class="sentinel"
		use:inview={{
			rootMargin: '50px'
		}}
		oninview_change={(e) => {
			if (maxVisible >= data.ranks.length) {
				e.detail.observer.disconnect();
			}
			maxVisible += 10;
		}}
	></div>
</div>
