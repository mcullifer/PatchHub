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
	import type { ISteamAppNews, ISteamNewsItem } from '$lib/models/Steam';
	import { getGameNews } from '$lib/remote/games.remote';
	import { BBCodeService } from '$lib/services/BBCodeService';
	import DOMPurify from 'dompurify';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedId = $state<string | null>(null);
	let headerImageIndex = $state(0);

	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const headerImageUrls = $derived(
		[
			data.game.headerImageUrl,
			`https://cdn.akamai.steamstatic.com/steam/apps/${data.game.appid}/header.jpg`
		].filter((url): url is string => typeof url === 'string' && url.length > 0)
	);
	const headerImageUrl = $derived(headerImageUrls[headerImageIndex] ?? null);
	const newsQuery = $derived(getGameNews({ appid: data.game.appid, count: 10 }));

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

	function getHeroStats(selectedNews: ISteamNewsItem | null): UpdateFeedStat[] {
		if (!selectedNews) return [];

		return [
			{ label: 'Latest selected', value: formatNewsDate(selectedNews.date) },
			{ label: 'Source', value: selectedNews.feedlabel || 'Steam' },
			{ label: 'Author', value: selectedNews.author || 'Steam' }
		];
	}

	function getNavItems(news: ISteamAppNews): UpdateFeedPostListItem[] {
		return news.newsitems.map((newsItem, index) => ({
			id: newsItem.gid,
			title: newsItem.title,
			dateLabel: formatNewsDate(newsItem.date),
			summary: getPostSummary(newsItem),
			icon: getPostIcon(newsItem, index),
			isSelected: isSelected(newsItem, index)
		}));
	}

	function isSelected(newsItem: ISteamNewsItem, index: number): boolean {
		return selectedId === newsItem.gid || (selectedId === null && index === 0);
	}

	function getPostIcon(newsItem: ISteamNewsItem, index: number): string {
		return isSelected(newsItem, index) ? 'radio_button_checked' : 'article';
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

	function sanitizeHtml(html: string): string {
		return DOMPurify.sanitize(html);
	}

	function useNextHeaderImage(): void {
		headerImageIndex += 1;
	}
</script>

<svelte:head>
	<title>{data.game.name}</title>
</svelte:head>

<div class="bg-base-100 min-h-full">
	{#await newsQuery}
		<div class="flex h-full items-center justify-center p-6">
			<div class="card bg-base-200 border-base-300 w-full max-w-md border shadow-sm">
				<div class="card-body items-center gap-4 text-center">
					<span class="loading loading-spinner loading-lg text-primary"></span>
					<p class="text-base-content/70 text-sm">Loading Steam posts for {data.game.name}</p>
				</div>
			</div>
		</div>
	{:then rawNews}
		{@const news = parseNews(rawNews)}
		{@const selectedNews = getSelectedNews(news)}
		{@const heroStats = getHeroStats(selectedNews)}
		{@const navItems = getNavItems(news)}

		<div class="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
			{#snippet fallbackIcon()}
				<Icon icon="sports_esports" size="xl" class="text-base-content/30" />
			{/snippet}

			{#snippet heroBadges()}
				<span class="badge badge-info badge-soft gap-1">
					<Icon icon="sports_esports" size="xs" />
					Steam
				</span>
				<span class="badge bg-base-100/95 border-base-300 text-base-content shadow-sm">
					App {data.game.appid}
				</span>
				<span class="badge bg-base-100/95 border-base-300 text-base-content shadow-sm">
					{news.count} posts
				</span>
			{/snippet}

			<UpdateFeedHero
				title={data.game.name}
				description="Steam announcements and update posts collected into one readable feed."
				imageUrl={headerImageUrl}
				stats={heroStats}
				{fallbackIcon}
				badges={heroBadges}
				onimageerror={useNextHeaderImage}
			/>

			<div class="grid min-h-0 gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
				<UpdateFeedPostList
					title="Posts"
					description="Newest Steam news from this app."
					ariaLabel="Steam news"
					items={navItems}
					emptyMessage="Steam has not returned news for this game."
					onselect={(id) => (selectedId = id)}
				/>

				<section class="min-w-0">
					{#if selectedNews}
						{#snippet articleBadges()}
							<span class="badge badge-ghost gap-1">
								<Icon icon="calendar_month" size="xs" />
								{formatNewsDate(selectedNews.date)}
							</span>
							{#if selectedNews.author}
								<span class="badge badge-ghost gap-1">
									<Icon icon="person" size="xs" />
									{selectedNews.author}
								</span>
							{/if}
							{#if selectedNews.feedlabel}
								<span class="badge badge-outline">{selectedNews.feedlabel}</span>
							{/if}
						{/snippet}

						<UpdateFeedArticle
							title={selectedNews.title}
							sourceLabel="Steam"
							sourceUrl={selectedNews.url}
							badges={articleBadges}
						>
							<div
								class="prose prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content prose-a:link prose-a:link-primary max-w-none"
							>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html sanitizeHtml(selectedNews.contents)}
							</div>
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
	{:catch}
		<div class="mx-auto max-w-3xl p-6">
			<div class="alert alert-error shadow-sm">
				<Icon icon="error" />
				<div>
					<h2 class="font-semibold">Steam news could not be loaded</h2>
					<p class="text-sm">Try refreshing the page or opening another Steam app.</p>
				</div>
			</div>
		</div>
	{/await}
</div>
