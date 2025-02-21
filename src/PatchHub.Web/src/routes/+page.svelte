<script lang="ts">
	import TopGamesSection from '$lib/components/layout/TopGamesSection.svelte';
	import TopSoftwareSection from '$lib/components/layout/TopSoftwareSection.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>PatchHub</title>
</svelte:head>

<div class="m-4 mx-auto w-full max-w-7xl space-y-2 px-2">
	<TopSoftwareSection />
	<TopGamesSection games={data.topGames} />
</div>
