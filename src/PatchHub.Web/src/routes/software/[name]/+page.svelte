<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import {
		UpdateFeedArticle,
		UpdateFeedEmptyState,
		UpdateFeedHero,
		UpdateFeedPostList,
		type UpdateFeedMetaItem,
		type UpdateFeedPostListItem
	} from '$lib/components/update-feed';
	import type { SoftwareUpdateEntry } from '$lib/models/Software';
	import DOMPurify from 'dompurify';
	import { onMount, tick } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedId = $state<string | null>(null);
	let canRenderSanitizedHtml = $state(false);

	const articleSectionId = 'software-update-article';
	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const selectedUpdate = $derived(getSelectedUpdate(data.detail.entries));
	const navItems = $derived<UpdateFeedPostListItem[]>(
		data.detail.entries.map((entry, index) => ({
			id: entry.id,
			title: entry.title,
			dateLabel: formatDate(entry.publishedAt),
			summary: entry.summary,
			isSelected: isSelected(entry, index)
		}))
	);

	onMount(() => {
		canRenderSanitizedHtml = true;
	});

	function getSelectedUpdate(entries: SoftwareUpdateEntry[]): SoftwareUpdateEntry | null {
		return entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;
	}

	function isSelected(entry: SoftwareUpdateEntry, index: number): boolean {
		return selectedId === entry.id || (selectedId === null && index === 0);
	}

	function formatDate(value: string | null): string {
		if (!value) return 'Unknown';
		return dateFormatter.format(new Date(value));
	}

	function getArticleMeta(entry: SoftwareUpdateEntry): UpdateFeedMetaItem[] {
		const meta: (UpdateFeedMetaItem | null)[] = [
			{ label: 'Published', value: formatDate(entry.publishedAt) },
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
		await tick();
		document.getElementById(articleSectionId)?.scrollIntoView({ block: 'start' });
	}
</script>

<svelte:head>
	<title>{data.detail.source.name}</title>
</svelte:head>

<div class="bg-base-100 min-h-full">
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
		{#snippet fallbackIcon()}
			<Icon icon={data.detail.source.icon} size="xl" class="text-base-content/30" />
		{/snippet}

		<UpdateFeedHero
			title={data.detail.source.name}
			description={data.detail.source.description}
			imageUrl={data.detail.source.imageUrl}
			imageAlt={data.detail.source.imageAlt}
			{fallbackIcon}
		/>

		{#if data.detail.health.error}
			<div class="alert alert-warning alert-soft">
				<Icon icon="warning" />
				<span>{data.detail.health.error}</span>
			</div>
		{/if}

		<div class="grid min-h-0 gap-5 lg:grid-cols-[minmax(280px,380px)_1fr]">
			<UpdateFeedPostList
				title="Updates"
				description="Newest posts from this source."
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
						meta={getArticleMeta(selectedUpdate)}
					>
						{#if selectedUpdate.contentHtml}
							{#if canRenderSanitizedHtml}
								<div
									class="patchhub-rich-text prose prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content prose-a:link prose-a:link-primary max-w-none"
								>
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html DOMPurify.sanitize(selectedUpdate.contentHtml)}
								</div>
							{:else}
								<div class="space-y-3" role="status" aria-label="Loading article content">
									<div class="skeleton h-4 w-full"></div>
									<div class="skeleton h-4 w-11/12"></div>
									<div class="skeleton h-4 w-10/12"></div>
									<div class="skeleton mt-6 h-32 w-full"></div>
								</div>
							{/if}
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
</div>
