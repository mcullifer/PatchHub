<script lang="ts">
	import { Button, Icon, VisibleWhenInView } from '$lib/components/common-ui';
	import type { INamedSteamGame } from '$lib/models/Steam';
	import { getTopGames } from '$lib/remote/topgames.remote';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	type TopGameSectionProps = {
		item: Snippet<[INamedSteamGame]>;
		class?: ClassValue;
	};
	let { item, class: classNames = '' }: TopGameSectionProps = $props();
	let inview = $state<ReturnType<typeof VisibleWhenInView>>();
	let showMore = $state(false);
</script>

<section class={classNames}>
	<div class="mb-6">
		<div class="border-base-content/10 flex items-end justify-between border-b pb-4">
			<div>
				<h2 class="mb-1 flex items-center gap-3 text-2xl font-bold">
					<Icon icon="sports_esports" size="md" />
					<span>Games</span>
				</h2>
				<p class="text-base-content/50 text-sm">Latest patches and updates</p>
			</div>
			<div class="badge badge-ghost badge-lg gap-2">
				<svg
					class="w-4 fill-black dark:fill-white"
					role="img"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<title>Steam</title>
					<path
						d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"
					/>
				</svg>
				Steam®
			</div>
		</div>
	</div>
	<div class="grow gap-4 max-sm:flex max-sm:flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3">
		{#await getTopGames()}
			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
			{#each Array(6) as _, i (i)}
				<!-- TODO: Wtf is going on here like just grow my boy pls -->
				<div class="skeleton flex min-h-64 min-w-72 grow"></div>
			{/each}
		{:then games}
			<VisibleWhenInView
				bind:this={inview}
				items={games}
				visibleOnStart={6}
				increment={10}
				opts={{ immediate: false }}
			>
				{#snippet template(game)}
					{@render item(game)}
				{/snippet}
			</VisibleWhenInView>
		{/await}
	</div>
	{#if !showMore}
		<div class="mt-8 flex w-full justify-center">
			<Button
				text="Show more games"
				class="btn btn-outline btn-sm gap-2"
				onclick={() => {
					showMore = true;
					inview?.resume();
				}}
			>
				<Icon icon="expand_more" size="xs" />
			</Button>
		</div>
	{/if}
</section>
