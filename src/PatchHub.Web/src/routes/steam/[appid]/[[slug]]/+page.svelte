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
	import type { ISteamAppNews, ISteamNewsItem } from '$lib/models/Steam';
	import { getGameNews, getSteamHeaderImage } from '$lib/remote/games.remote';
	import { BBCodeService } from '$lib/services/BBCodeService';
	import DOMPurify from 'dompurify';
	import { onMount, tick } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedId = $state<string | null>(null);
	let resolvedHeaderImageUrl = $state<string | null>(null);
	let triedResolvedHeaderImage = $state(false);
	let canRenderSanitizedHtml = $state(false);

	const articleSectionId = 'steam-news-article';
	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const headerImageUrl = $derived(
		resolvedHeaderImageUrl ??
			(data.game.headerImageUrl.length > 0 ? data.game.headerImageUrl : null)
	);

	onMount(() => {
		canRenderSanitizedHtml = true;
	});

	function parseNews(news: ISteamAppNews | null): ISteamAppNews {
		if (!news) {
			return {
				appid: data.game.appid,
				newsitems: [],
				count: 0
			};
		}

		return {
			...news,
			newsitems: news.newsitems.map((item) => ({
				...item,
				contents: BBCodeService.bbcodeToHtml(item.contents, 'double')
			}))
		};
	}

	function getSelectedNews(news: ISteamAppNews): ISteamNewsItem | null {
		return news.newsitems.find((item) => item.gid === selectedId) ?? news.newsitems[0] ?? null;
	}

	function getNavItems(news: ISteamAppNews): UpdateFeedPostListItem[] {
		return news.newsitems.map((newsItem, index) => ({
			id: newsItem.gid,
			title: newsItem.title,
			dateLabel: formatNewsDate(newsItem.date),
			summary: getPostSummary(newsItem),
			isSelected: isSelected(newsItem, index)
		}));
	}

	function isSelected(newsItem: ISteamNewsItem, index: number): boolean {
		return selectedId === newsItem.gid || (selectedId === null && index === 0);
	}

	function getPostSummary(newsItem: ISteamNewsItem): string {
		const text = newsItem.contents
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();

		return text.length > 160 ? `${text.slice(0, 157)}...` : text;
	}

	function formatNewsDate(timestamp: number): string {
		return dateFormatter.format(new Date(timestamp * 1000));
	}

	function getArticleMeta(newsItem: ISteamNewsItem): UpdateFeedMetaItem[] {
		return [{ label: 'Published', value: formatNewsDate(newsItem.date) }];
	}

	async function resolveHeaderImage(): Promise<void> {
		if (triedResolvedHeaderImage) {
			resolvedHeaderImageUrl = null;
			return;
		}

		triedResolvedHeaderImage = true;

		try {
			const headerImage = await getSteamHeaderImage(data.game.appid);
			resolvedHeaderImageUrl =
				headerImage && headerImage !== data.game.headerImageUrl ? headerImage : null;
		} catch {
			resolvedHeaderImageUrl = null;
		}
	}

	async function selectNewsItem(id: string): Promise<void> {
		selectedId = id;
		await tick();
		document.getElementById(articleSectionId)?.scrollIntoView({ block: 'start' });
	}
</script>

<svelte:head>
	<title>{data.game.name}</title>
</svelte:head>

<div class="bg-base-100 min-h-full">
	<svelte:boundary>
		{@const rawNews = await getGameNews({ appid: data.game.appid, count: 10 })}
		{@const news = parseNews(rawNews)}
		{@const selectedNews = getSelectedNews(news)}
		{@const navItems = getNavItems(news)}

		<div class="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
			{#snippet fallbackIcon()}
				<Icon icon="sports_esports" size="xl" class="text-base-content/30" />
			{/snippet}

			<UpdateFeedHero
				title={data.game.name}
				description="Steam announcements and update posts collected into one readable feed."
				imageUrl={headerImageUrl}
				{fallbackIcon}
				onimageerror={resolveHeaderImage}
			/>

			<div class="grid min-h-0 gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
				<UpdateFeedPostList
					title="Posts"
					description="Newest Steam news from this app."
					ariaLabel="Steam news"
					items={navItems}
					emptyMessage="Steam has not returned news for this game."
					onselect={selectNewsItem}
				/>

				<section id={articleSectionId} class="min-w-0 scroll-mt-24">
					{#if selectedNews}
						<UpdateFeedArticle
							title={selectedNews.title}
							sourceLabel="Steam"
							sourceUrl={selectedNews.url}
							meta={getArticleMeta(selectedNews)}
						>
							{#if canRenderSanitizedHtml}
								<div
									class="prose prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content prose-a:link prose-a:link-primary max-w-none"
								>
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html DOMPurify.sanitize(selectedNews.contents)}
								</div>
							{:else}
								<div class="space-y-3" role="status" aria-label="Loading article content">
									<div class="skeleton h-4 w-full"></div>
									<div class="skeleton h-4 w-11/12"></div>
									<div class="skeleton h-4 w-10/12"></div>
									<div class="skeleton mt-6 h-32 w-full"></div>
								</div>
							{/if}
						</UpdateFeedArticle>
					{:else}
						<UpdateFeedEmptyState
							title="No Steam posts found"
							description="Steam did not return announcements or update posts for this app."
						/>
					{/if}
				</section>
			</div>
		</div>

		{#snippet pending()}
			<div class="flex h-full items-center justify-center p-6">
				<div class="card bg-base-200 border-base-300 w-full max-w-md border shadow-sm">
					<div class="card-body items-center gap-4 text-center">
						<span class="loading loading-spinner loading-lg text-primary"></span>
						<p class="text-base-content/70 text-sm">Loading Steam posts for {data.game.name}</p>
					</div>
				</div>
			</div>
		{/snippet}

		{#snippet failed()}
			<div class="mx-auto max-w-3xl p-6">
				<div class="alert alert-error shadow-sm">
					<Icon icon="error" />
					<div>
						<h2 class="font-semibold">Steam news could not be loaded</h2>
						<p class="text-sm">Try refreshing the page or opening another Steam app.</p>
					</div>
				</div>
			</div>
		{/snippet}
	</svelte:boundary>
</div>
