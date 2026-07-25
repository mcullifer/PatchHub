<script module lang="ts">
	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { FavoriteHeart, Icon, MediaCard } from '$lib/components/common-ui';
	import { Tooltip } from '$lib/components/common-ui/floating';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import { useFavorites } from '$lib/contexts/favorites.svelte';
	import type { getSoftwareSourceSummaries } from '$lib/remote/software.remote';
	import { parseDateForDisplay } from '$lib/util/time';

	type SoftwareSummary = Awaited<ReturnType<typeof getSoftwareSourceSummaries>>[number];

	let { summary }: { summary: SoftwareSummary } = $props();

	const currentUser = getCurrentUser();
	const favorites = useFavorites();

	const publishedAt = $derived(summary.latestUpdate?.publishedAt);
	const formattedDate = $derived(
		publishedAt ? dateFormatter.format(parseDateForDisplay(publishedAt)) : 'No updates yet'
	);
</script>

<MediaCard
	href={resolve(`/software/${summary.source.slug}`)}
	title={summary.source.name}
	description={summary.latestUpdate?.title}
	actionLabel="Updates"
	class="aspect-[1200/630]"
>
	{#snippet media()}
		<img
			class="h-full w-full object-cover"
			src={summary.source.imageUrl}
			alt={summary.source.imageAlt}
			loading="lazy"
		/>
	{/snippet}

	{#snippet topRight()}
		{#if currentUser() !== null && summary.externalItemId}
			{@const externalItemId = summary.externalItemId}
			<Tooltip>
				{#snippet reference(floating)}
					<FavoriteHeart
						favorited={favorites.isExternalItemFavorited(externalItemId)}
						onToggle={() => favorites.toggleExternalItem(externalItemId)}
						{...floating.reference({ class: ['btn-sm'] })}
					/>
				{/snippet}
				<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm font-normal">
					Favorite
				</div>
			</Tooltip>
		{/if}
	{/snippet}

	{#snippet meta()}
		<span class="inline-flex items-center gap-1 text-xs opacity-75">
			<Icon icon="calendar_month" size="xs" class="-ml-px" />
			{formattedDate}
		</span>
		{#if !summary.health.available}
			<span class="text-warning inline-flex items-center gap-1 text-xs opacity-75">
				<Icon icon="cloud_off" size="xs" />
				Source unavailable
			</span>
		{/if}
	{/snippet}
</MediaCard>
