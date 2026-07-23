<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { Card, GameCard, Icon } from '$lib/components/common-ui';
	import FavoritesSection from '$lib/components/favorites/FavoritesSection.svelte';
	import TopGamesSection from '$lib/components/layout/TopGamesSection.svelte';
	import TopSoftwareSection from '$lib/components/layout/TopSoftwareSection.svelte';
	import { TextAnimate } from '$lib/components/magic';
	import { DotPattern } from '$lib/components/magic/dot-pattern';
	import { getCurrentUser } from '$lib/contexts/currentUser';

	const currentUser = getCurrentUser();
</script>

<Seo
	title="PatchHub — One place for updates"
	description="Follow patch notes for games and software, or publish updates for your own projects—all in one place."
/>

<svelte:head>
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebSite",
			"name": "PatchHub",
			"url": "https://patchhub.io/",
			"description": "One place to follow patch notes or publish updates for your own projects."
		}
	</script>
</svelte:head>

{#snippet cardFailed()}
	<Card class="bg-base-200 text-center">
		<Icon icon="error" class="text-error self-center pt-8" size="xl" />
		<p class="mt-2 text-sm opacity-70">Something went wrong</p>
	</Card>
{/snippet}

<div class="bg-base-200 relative overflow-hidden">
	<header class="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
		<h1 class="text-4xl font-bold tracking-tighter text-balance md:text-6xl">
			<TextAnimate class="inline" content="One place for" animation="blurInUp" once />
			<TextAnimate
				class="text-primary inline"
				content="updates"
				animation="blurInUp"
				delay={0.3}
				once
			/>
		</h1>
		<TextAnimate
			class="text-base-content/60 mt-3 max-w-xl text-pretty sm:text-lg"
			content="Patch notes and release feeds for the games and software you follow."
			animation="blurInUp"
			delay={0.5}
			once
		/>
		<div
			class="absolute top-1/2 right-4 hidden -translate-y-1/2 sm:right-6 lg:right-8 lg:block"
			aria-hidden="true"
		>
			<div class="relative h-52 w-80 xl:w-[26rem]">
				<div class="absolute -inset-y-4 -right-4 -left-[26rem]">
					<DotPattern
						glow={true}
						animated={false}
						class="mask-[linear-gradient(to_right,transparent,white_30%,white_88%,transparent),linear-gradient(to_bottom,transparent,white_28%,white_72%,transparent)] [mask-composite:intersect]"
					/>
				</div>
			</div>
		</div>
	</header>
</div>

<div class="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
	{#if currentUser()}
		<FavoritesSection />
	{/if}

	<TopGamesSection>
		{#snippet item(game, featured)}
			<svelte:boundary>
				<GameCard {game} {featured} />
				{#snippet failed()}
					{@render cardFailed()}
				{/snippet}
			</svelte:boundary>
		{/snippet}
	</TopGamesSection>

	<TopSoftwareSection />
</div>
