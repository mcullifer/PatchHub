<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { FavoriteHeart, Icon } from '$lib/components/common-ui';
	import { Tooltip } from '$lib/components/common-ui/floating';
	import {
		UpdateFeedArticle,
		UpdateFeedContent,
		UpdateFeedEmptyState,
		UpdateFeedHero,
		UpdateFeedPostList,
		type UpdateFeedBadge,
		type UpdateFeedMetaItem,
		type UpdateFeedPostListItem
	} from '$lib/components/update-feed';
	import { updateFeedGridClass } from '$lib/components/update-feed/layout';
	import { scrollArticleIntoView } from '$lib/components/update-feed/scrollArticle';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import { useFavorites } from '$lib/contexts/favorites.svelte';
	import type { SoftwareUpdateEntry } from '$lib/models/Software';
	import { formatFeedDate } from '$lib/util/time';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedId = $state<string | null>(null);

	const articleSectionId = 'software-update-article';
	const currentUser = getCurrentUser();
	const favorites = useFavorites();
	const externalItemId = $derived(data.detail.externalItemId);
	const selectedUpdate = $derived(getSelectedUpdate(data.detail.entries));
	const isExcerptSource = $derived(data.detail.source.rendering === 'excerpt');
	const articleBadges = $derived<UpdateFeedBadge[]>(
		isExcerptSource ? [{ label: data.detail.source.provider, tone: 'info' }] : []
	);
	const navItems = $derived<UpdateFeedPostListItem[]>(
		data.detail.entries.map((entry, index) => ({
			id: entry.id,
			title: entry.title,
			dateLabel: formatFeedDate(entry.publishedAt),
			isSelected: isSelected(entry, index)
		}))
	);

	function getSelectedUpdate(entries: SoftwareUpdateEntry[]): SoftwareUpdateEntry | null {
		return entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;
	}

	function isSelected(entry: SoftwareUpdateEntry, index: number): boolean {
		return selectedId === entry.id || (selectedId === null && index === 0);
	}

	function getArticleMeta(entry: SoftwareUpdateEntry): UpdateFeedMetaItem[] {
		const meta: (UpdateFeedMetaItem | null)[] = [
			{ label: 'Published', value: formatFeedDate(entry.publishedAt) },
			entry.metadata.driverVersion
				? { label: 'Driver', value: entry.metadata.driverVersion }
				: null,
			entry.metadata.kbId ? { label: 'KB', value: entry.metadata.kbId } : null,
			entry.metadata.windowsVersion
				? { label: 'Windows', value: entry.metadata.windowsVersion }
				: null,
			entry.metadata.build ? { label: 'Build', value: entry.metadata.build } : null
		];

		return meta.filter((item): item is UpdateFeedMetaItem => item !== null);
	}

	async function selectUpdate(id: string): Promise<void> {
		selectedId = id;
		await scrollArticleIntoView(articleSectionId);
	}
</script>

<Seo
	title={data.detail.source.name}
	description="{data.detail.source.description} | Tracked on PatchHub"
/>

<div class="mx-auto flex min-h-full w-full max-w-6xl flex-col pb-4 sm:gap-4 sm:p-4">
	{#snippet fallbackIcon()}
		<Icon icon={data.detail.source.icon} size="xl" class="text-base-content/30" />
	{/snippet}

	{#snippet overlay()}
		{#if currentUser() !== null && externalItemId}
			<Tooltip>
				{#snippet reference(floating)}
					<FavoriteHeart
						favorited={favorites.isExternalItemFavorited(externalItemId)}
						onToggle={() => favorites.toggleExternalItem(externalItemId)}
						{...floating.reference({
							class: ['btn-sm']
						})}
					/>
				{/snippet}
				<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm font-normal">
					Favorite
				</div>
			</Tooltip>
		{/if}
	{/snippet}

	<UpdateFeedHero
		title={data.detail.source.name}
		description={data.detail.source.description}
		imageUrl={data.detail.source.imageUrl}
		imageAlt={data.detail.source.imageAlt}
		{fallbackIcon}
		{overlay}
	/>

	{#if data.detail.health.error}
		<div class="alert alert-warning alert-soft max-sm:mx-4">
			<Icon icon="warning" />
			<span>{data.detail.health.error}</span>
		</div>
	{/if}

	<div class={updateFeedGridClass}>
		<UpdateFeedPostList
			title="Updates"
			ariaLabel="Software updates"
			items={navItems}
			emptyMessage="This software source has no updates to show yet."
			onselect={selectUpdate}
		/>

		<section id={articleSectionId} class="min-w-0 scroll-mt-24">
			{#if selectedUpdate}
				<UpdateFeedArticle
					title={selectedUpdate.title}
					sourceLabel="Source"
					sourceUrl={selectedUpdate.sourceUrl}
					badges={articleBadges}
					meta={getArticleMeta(selectedUpdate)}
				>
					{#if isExcerptSource}
						<div class="flex max-w-[70ch] flex-col gap-4">
							<p class="text-base-content/80 leading-relaxed text-pretty">
								{selectedUpdate.summary}
							</p>
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={selectedUpdate.sourceUrl}
								class="btn btn-primary w-fit"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Icon icon="open_in_new" size="sm" />
								Read at {data.detail.source.provider}
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						</div>
					{:else if selectedUpdate.contentHtml}
						<UpdateFeedContent html={selectedUpdate.contentHtml} />
					{:else}
						<div class="alert alert-info alert-soft">
							<Icon icon="info" />
							<span>
								This source did not include article content. Open the source link to read the full
								update.
							</span>
						</div>
					{/if}
				</UpdateFeedArticle>
			{:else}
				<UpdateFeedEmptyState
					title="No updates found"
					description="The source is configured, but no update posts were returned."
				/>
			{/if}
		</section>
	</div>
</div>
