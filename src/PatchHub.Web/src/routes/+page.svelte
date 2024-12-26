<script lang="ts">
	import GameCard from '$lib/components/common-ui/GameCard.svelte';
	import { inview } from 'svelte-inview';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let maxVisible = $state(10);
	let visibleGames = $derived(data.ranks.slice(0, maxVisible));
</script>

<div class="m-4 mx-auto max-w-7xl px-4 text-2xl font-bold">Top Games</div>
<div
	class="mx-auto max-w-7xl gap-4 px-4 max-sm:flex max-sm:flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3"
>
	{#each visibleGames as game}
		<GameCard {game} />
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
