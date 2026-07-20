<script lang="ts">
	import { Icon, VisibleWhenInView } from '$lib/components/common-ui';
	import SectionHeader from '$lib/components/layout/SectionHeader.svelte';
	import type { INamedSteamGame } from '$lib/models/Steam';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	type TopGameSectionProps = {
		games: INamedSteamGame[];
		item: Snippet<[INamedSteamGame, boolean]>;
		id?: string;
		class?: ClassValue;
	};
	let { games, item, id, class: classNames = '' }: TopGameSectionProps = $props();
	let showMore = $state(false);

	const visibleOnStart = 5;
	const gridGames = $derived(games.slice(1));
	const hiddenCount = $derived(gridGames.length - visibleOnStart);
</script>

<section {id} class={['scroll-mt-4', classNames]}>
	<SectionHeader title="Games">
		{#snippet attribution()}
			<svg
				class="w-3.5 fill-current"
				role="img"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>Steam</title>
				<path
					d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"
				/>
			</svg>
			Data from Steam
		{/snippet}
	</SectionHeader>

	{#if games.length > 0}
		<div class="space-y-4">
			<div class="aura aura-gold block motion-reduce:animate-none">
				{@render item(games[0], true)}
			</div>
			<div class="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<VisibleWhenInView items={gridGames} enabled={showMore} {visibleOnStart} increment={12}>
					{#snippet template(game)}
						{@render item(game, false)}
					{/snippet}
				</VisibleWhenInView>
				{#if !showMore && hiddenCount > 0}
					<button
						type="button"
						class="card card-border border-base-content/20 bg-base-200/50 hover:bg-base-200 hover:border-base-content/40 grid min-h-40 cursor-pointer place-items-center border-dashed transition-colors"
						onclick={() => {
							showMore = true;
						}}
					>
						<span class="text-center">
							<span class="text-base-content/70 block text-3xl font-bold">+{hiddenCount}</span>
							<span class="text-base-content/60 text-sm">more games</span>
						</span>
					</button>
				{/if}
			</div>
		</div>
	{:else}
		<div class="alert alert-info alert-soft">
			<Icon icon="info" />
			<span>No games to show right now.</span>
		</div>
	{/if}
</section>
