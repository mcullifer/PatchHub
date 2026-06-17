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
	import { getDefaultSteamHeaderImageUrl } from '$lib/util/SteamAssets';
	import DOMPurify from 'dompurify';
	import { onMount, tick } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedNewsId = $state<string | null>(null);
	let headerImageOverride = $state<{ appid: number; url: string | null } | null>(null);
	let canRenderSanitizedHtml = $state(false);

	const articleSectionId = 'steam-news-article';
	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const defaultHeaderImageUrl = $derived(getDefaultSteamHeaderImageUrl(data.game.appid));
	const headerImageUrl = $derived(
		headerImageOverride?.appid === data.game.appid ? headerImageOverride.url : defaultHeaderImageUrl
	);

	function parseNews(news: ISteamAppNews | null): ISteamAppNews {
		if (!news) {
			return { appid: data.game.appid, newsitems: [], count: 0 };
		}

		return {
			...news,
			newsitems: news.newsitems.map((item) => ({
				...item,
				contents: BBCodeService.bbcodeToHtml(item.contents, 'double')
			}))
		};
	}

	function formatNewsDate(timestamp: number): string {
		return dateFormatter.format(new Date(timestamp * 1000));
	}

	function getArticleMeta(newsItem: ISteamNewsItem): UpdateFeedMetaItem[] {
		return [{ label: 'Published', value: formatNewsDate(newsItem.date) }];
	}

	async function resolveHeaderImage(): Promise<void> {
		const appid = data.game.appid;
		const failedUrl = headerImageUrl;
		headerImageOverride = { appid, url: null };

		try {
			const headerImage = await getSteamHeaderImage(appid);
			if (appid !== data.game.appid) return;

			if (headerImage && headerImage !== failedUrl) {
				headerImageOverride = { appid, url: headerImage };
			}
		} catch {
			if (appid === data.game.appid) {
				headerImageOverride = { appid, url: null };
			}
		}
	}

	async function selectNewsItem(id: string): Promise<void> {
		selectedNewsId = id;
		await tick();

		const articleSection = document.getElementById(articleSectionId);
		if (!articleSection) return;

		const isScrolledPastArticleStart = articleSection.getBoundingClientRect().top < 96;
		if (isScrolledPastArticleStart) {
			articleSection.scrollIntoView({ block: 'start' });
		}
	}

	onMount(() => {
		canRenderSanitizedHtml = true;
	});
</script>

<svelte:head>
	<title>{data.game.name}</title>
</svelte:head>

<div class="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 p-4 lg:p-6">
	{#snippet newsSkeleton()}
		<div
			class="grid min-h-0 gap-4 lg:grid-cols-4"
			role="status"
			aria-label="Loading Steam posts"
			aria-busy="true"
		>
			<aside class="card bg-base-200 h-fit lg:sticky lg:top-20 lg:col-span-1">
				<div class="card-body">
					<div class="skeleton h-64 w-full"></div>
				</div>
			</aside>

			<section id={articleSectionId} class="min-w-0 scroll-mt-24 lg:col-span-3">
				<article class="card bg-base-200">
					<div class="card-body">
						<div class="skeleton min-h-96 w-full"></div>
					</div>
				</article>
			</section>
		</div>
	{/snippet}

	<UpdateFeedHero
		title={data.game.name}
		description="Steam announcements and update posts collected into one readable feed."
		imageUrl={headerImageUrl}
		onimageerror={resolveHeaderImage}
	>
		{#snippet fallbackIcon()}
			<Icon icon="sports_esports" size="xl" class="text-base-content/30" />
		{/snippet}
	</UpdateFeedHero>

	<svelte:boundary>
		{@const rawNews = await getGameNews({ appid: data.game.appid, count: 10 })}
		{@const news = parseNews(rawNews)}
		{@const selectedNews =
			news.newsitems.find((newsItem) => newsItem.gid === selectedNewsId) ??
			news.newsitems[0] ??
			null}
		{@const navItems = news.newsitems.map(
			(newsItem): UpdateFeedPostListItem => ({
				id: newsItem.gid,
				title: newsItem.title,
				dateLabel: formatNewsDate(newsItem.date),
				isSelected: selectedNews?.gid === newsItem.gid
			})
		)}

		<div class="grid min-h-0 gap-4 lg:grid-cols-4">
			<UpdateFeedPostList
				title="Posts"
				description="Latest Steam posts"
				ariaLabel="Steam news"
				items={navItems}
				emptyMessage="Steam has not returned news for this game."
				onselect={selectNewsItem}
			/>

			<section id={articleSectionId} class="min-w-0 scroll-mt-24 lg:col-span-3">
				{#if selectedNews}
					<UpdateFeedArticle
						title={selectedNews.title}
						sourceLabel="Steam"
						sourceUrl={selectedNews.url}
						meta={getArticleMeta(selectedNews)}
					>
						{#if canRenderSanitizedHtml}
							<div
								class="patchhub-rich-text prose prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content prose-a:link prose-a:link-primary max-w-none"
							>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html DOMPurify.sanitize(selectedNews.contents)}
								<!-- <TipTap content={selectedNews.contents} /> -->
							</div>
						{:else}
							<div
								class="skeleton min-h-64 w-full"
								role="status"
								aria-label="Loading article content"
							></div>
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

		{#snippet pending()}
			{@render newsSkeleton()}
		{/snippet}

		{#snippet failed()}
			<div class="alert alert-error shadow-sm">
				<Icon icon="error" />
				<div>
					<h2 class="font-semibold">Steam news could not be loaded</h2>
					<p class="text-sm">Try refreshing the page or opening another Steam app.</p>
				</div>
			</div>
		{/snippet}
	</svelte:boundary>
</div>
