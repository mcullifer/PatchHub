<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import {
		UpdateFeedArticle,
		UpdateFeedEmptyState,
		UpdateFeedHero,
		UpdateFeedPostList,
		type UpdateFeedPostListItem,
		type UpdateFeedStat
	} from '$lib/components/update-feed';
	import type { SoftwareUpdateEntry } from '$lib/models/Software';
	import DOMPurify from 'dompurify';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedId = $state<string | null>(null);

	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const selectedUpdate = $derived(getSelectedUpdate(data.detail.entries));
	const latestUpdateDate = $derived(formatDate(data.detail.health.latestItemAt));
	const heroStats = $derived<UpdateFeedStat[]>([
		{ label: 'Latest update', value: latestUpdateDate },
		{ label: 'Posts loaded', value: data.detail.entries.length },
		{ label: 'Source', value: data.detail.source.provider }
	]);
	const navItems = $derived<UpdateFeedPostListItem[]>(
		data.detail.entries.map((entry, index) => ({
			id: entry.id,
			title: entry.title,
			dateLabel: formatDate(entry.publishedAt),
			summary: entry.summary,
			icon: isSelected(entry, index) ? 'radio_button_checked' : 'article',
			isSelected: isSelected(entry, index)
		}))
	);

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

	function sanitizeHtml(html: string): string {
		if (typeof DOMPurify.sanitize !== 'function') {
			return html;
		}

		return DOMPurify.sanitize(html);
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

		{#snippet heroBadges()}
			<span class="badge badge-info badge-soft gap-1">
				<Icon icon={data.detail.source.icon} size="xs" />
				{data.detail.source.vendor}
			</span>
			<span class="badge bg-base-100/95 border-base-300 text-base-content shadow-sm">
				{data.detail.source.sourceType}
			</span>
			<span
				class={[
					'badge gap-1',
					data.detail.health.status === 'unavailable'
						? 'badge-error badge-soft'
						: 'badge-success badge-soft'
				]}
			>
				<Icon icon={data.detail.health.status === 'unavailable' ? 'cloud_off' : 'sync'} size="xs" />
				{data.detail.health.status === 'fresh' ? 'Fresh' : data.detail.health.status}
			</span>
		{/snippet}

		<UpdateFeedHero
			title={data.detail.source.name}
			description={data.detail.source.description}
			imageUrl={data.detail.source.imageUrl}
			imageAlt={data.detail.source.imageAlt}
			stats={heroStats}
			{fallbackIcon}
			badges={heroBadges}
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
				onselect={(id) => (selectedId = id)}
			/>

			<section class="min-w-0">
				{#if selectedUpdate}
					{#snippet articleBadges()}
						<span class="badge badge-ghost gap-1">
							<Icon icon="calendar_month" size="xs" />
							{formatDate(selectedUpdate.publishedAt)}
						</span>
						{#if selectedUpdate.metadata.driverVersion}
							<span class="badge badge-outline">v{selectedUpdate.metadata.driverVersion}</span>
						{/if}
						{#if selectedUpdate.metadata.kbId}
							<span class="badge badge-outline">{selectedUpdate.metadata.kbId}</span>
						{/if}
						{#if selectedUpdate.metadata.windowsVersion}
							<span class="badge badge-outline">{selectedUpdate.metadata.windowsVersion}</span>
						{/if}
						{#if selectedUpdate.metadata.build}
							<span class="badge badge-outline">Build {selectedUpdate.metadata.build}</span>
						{/if}
					{/snippet}

					<UpdateFeedArticle
						title={selectedUpdate.title}
						sourceLabel="Source"
						sourceUrl={selectedUpdate.sourceUrl}
						badges={articleBadges}
					>
						{#if selectedUpdate.contentHtml}
							<div
								class="prose prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content prose-a:link prose-a:link-primary max-w-none"
							>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html sanitizeHtml(selectedUpdate.contentHtml)}
							</div>
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
