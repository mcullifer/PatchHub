<script lang="ts">
	import { resolve } from '$app/paths';
	import { FavoriteHeart, Icon, InView } from '$lib/components/common-ui';
	import { Tooltip } from '$lib/components/common-ui/floating';
	import SectionHeader from '$lib/components/layout/SectionHeader.svelte';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import { useFavorites } from '$lib/contexts/favorites.svelte';
	import { getSoftwareSourceSummaries } from '$lib/remote/software.remote';
	import type { ClassValue } from 'svelte/elements';

	let { class: className }: { class?: ClassValue } = $props();

	const currentUser = getCurrentUser();
	const favorites = useFavorites();

	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});

	function formatDate(value: string | null | undefined): string {
		if (!value) return 'No updates yet';
		return dateFormatter.format(new Date(value));
	}
</script>

<section class={className}>
	<SectionHeader title="Software">
		{#snippet attribution()}
			<Icon icon="rss_feed" size="xs" />
			Vendor & release feeds
		{/snippet}
	</SectionHeader>

	<svelte:boundary>
		{@const summaries = await getSoftwareSourceSummaries()}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each summaries as summary (summary.source.id)}
				<article
					class="group bg-base-300 rounded-box ring-base-content/20 relative aspect-[1200/630] overflow-hidden shadow-md ring-1"
				>
					<img
						class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.04] group-hover:duration-[350ms] motion-reduce:group-hover:scale-100"
						src={summary.source.imageUrl}
						alt={summary.source.imageAlt}
						loading="lazy"
					/>

					<div
						class="from-neutral via-neutral/40 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent"
					></div>

					<a
						data-sveltekit-preload-data="off"
						href={resolve(`/software/${summary.source.slug}`)}
						class="rounded-box focus-visible:ring-primary absolute inset-0 focus-visible:ring-2 focus-visible:outline-none"
						aria-label={summary.source.name}
					></a>

					{#if currentUser() !== null && summary.externalItemId}
						{@const externalItemId = summary.externalItemId}
						<Tooltip>
							{#snippet reference(floating)}
								<FavoriteHeart
									favorited={favorites.isExternalItemFavorited(externalItemId)}
									onToggle={() => favorites.toggleExternalItem(externalItemId)}
									{...floating.reference({
										class: ['btn-sm absolute top-2 right-2']
									})}
								/>
							{/snippet}
							<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm font-normal">
								Favorite
							</div>
						</Tooltip>
					{/if}

					<span
						class="badge badge-primary badge-sm pointer-events-none absolute right-4 bottom-4 translate-y-1 gap-1 opacity-0 transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:translate-y-0"
					>
						Updates
						<Icon icon="arrow_forward" size="xs" />
					</span>

					<div
						class="text-neutral-content pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4"
					>
						<h3 class="text-base leading-tight font-semibold">{summary.source.name}</h3>
						{#if summary.latestUpdate}
							<p class="line-clamp-1 text-sm opacity-90">{summary.latestUpdate.title}</p>
						{/if}
						<div class="flex items-center gap-2 text-xs opacity-75">
							<span class="inline-flex items-center gap-1">
								<Icon icon="calendar_month" size="xs" />
								{formatDate(summary.latestUpdate?.publishedAt)}
							</span>
							{#if summary.health.status === 'unavailable'}
								<span class="text-warning inline-flex items-center gap-1">
									<Icon icon="cloud_off" size="xs" />
									Source unavailable
								</span>
							{/if}
						</div>
					</div>
				</article>
			{:else}
				<div class="alert alert-info alert-soft">
					<Icon icon="info" />
					<span>No software sources are configured yet.</span>
				</div>
			{/each}
			<InView
				opts={{ rootMargin: '50px' }}
				onInviewChange={(e) => e.detail.observer.disconnect()}
			/>
		</div>
		{#snippet failed()}
			<div class="alert alert-error shadow-sm">
				<Icon icon="error" />
				<span>Software sources could not be loaded.</span>
			</div>
		{/snippet}

		{#snippet pending()}
			<div
				class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
				role="status"
				aria-busy="true"
			>
				<span class="sr-only">Loading software</span>
				{#each [1, 2, 3] as placeholder (placeholder)}
					<div class="skeleton aspect-[1200/630]"></div>
				{/each}
			</div>
		{/snippet}
	</svelte:boundary>
</section>
