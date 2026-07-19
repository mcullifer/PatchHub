<script lang="ts">
	import { page } from '$app/state';
	import Seo from '$lib/components/Seo.svelte';
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
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let selectedNewsId = $state<string | null>(null);
	let headerImageOverride = $state<{ appid: number; url: string | null } | null>(null);
	let canRenderSanitizedHtml = $state(false);

	const articleSectionId = 'steam-news-article';
	// During navigation data can transiently lack the loaded game; read it
	// through this derived (with ?.) instead of data.game so late re-evaluations
	// (e.g. header image recovery) never dereference undefined.
	const game = $derived(data.game);
	const routeSteamAppId = $derived.by(() => {
		const appid = Number.parseInt(page.params.appid ?? '', 10);
		return Number.isInteger(appid) ? appid : (game?.appid ?? Number.NaN);
	});
	const isLoadingRouteSteamGame = $derived(routeSteamAppId !== game?.appid);
	const steamHeroDescription =
		'Steam announcements and update posts collected into one readable feed.';
	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});

	function getHeaderImageUrl(appid: number): string | null {
		return headerImageOverride?.appid === appid
			? headerImageOverride.url
			: getDefaultSteamHeaderImageUrl(appid);
	}

	function parseNews(news: ISteamAppNews | null, appid: number): ISteamAppNews {
		if (!news) {
			return { appid, newsitems: [], count: 0 };
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

	function carouselNav(container: HTMLElement) {
		const onclick = (event: MouseEvent) => {
			if (!(event.target instanceof Element)) return;
			const button = event.target.closest('[data-carousel-prev], [data-carousel-next]');
			const carousel = button?.parentElement?.querySelector('.carousel');
			if (!carousel) return;
			const direction = button?.hasAttribute('data-carousel-prev') ? -1 : 1;
			const itemWidth =
				carousel.querySelector('.carousel-item')?.clientWidth ?? carousel.clientWidth;
			carousel.scrollBy({ left: direction * itemWidth });
		};
		container.addEventListener('click', onclick);
		return () => container.removeEventListener('click', onclick);
	}

	async function resolveHeaderImage(): Promise<void> {
		const appid = game?.appid;
		if (appid === undefined) return;

		const failedUrl = getHeaderImageUrl(appid);
		headerImageOverride = { appid, url: null };

		try {
			const headerImage = await getSteamHeaderImage(appid);
			if (appid !== game?.appid) return;

			if (headerImage && headerImage !== failedUrl) {
				headerImageOverride = { appid, url: headerImage };
			}
		} catch {
			if (appid === game?.appid) {
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

<Seo
	title={game?.name ?? 'PatchHub'}
	description={game
		? `${game.name} patch notes, updates, and announcements, tracked on PatchHub.`
		: undefined}
	image={game ? getDefaultSteamHeaderImageUrl(game.appid) : undefined}
/>

<div class="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-3 p-2 sm:gap-4 sm:p-4 lg:p-6">
	{#snippet newsSkeleton()}
		<div
			class="grid min-h-0 gap-3 sm:gap-4 lg:grid-cols-4"
			role="status"
			aria-label="Loading Steam posts"
			aria-busy="true"
		>
			<aside class="h-fit min-w-0 lg:sticky lg:top-20">
				<div class="skeleton h-10 w-full lg:hidden"></div>
				<div class="card card-sm bg-base-200 hidden lg:block">
					<div class="card-body">
						<div class="skeleton h-64 w-full"></div>
					</div>
				</div>
			</aside>

			<section id={articleSectionId} class="min-w-0 scroll-mt-24 lg:col-span-3">
				<article class="card card-sm md:card-md bg-base-200">
					<div class="card-body">
						<div class="skeleton min-h-96 w-full"></div>
					</div>
				</article>
			</section>
		</div>
	{/snippet}

	{#key routeSteamAppId}
		<UpdateFeedHero
			title={isLoadingRouteSteamGame || !game ? 'Loading Steam game' : game.name}
			description={steamHeroDescription}
			imageUrl={isLoadingRouteSteamGame || !game ? null : getHeaderImageUrl(game.appid)}
			loading={isLoadingRouteSteamGame}
			onimageerror={resolveHeaderImage}
		>
			{#snippet fallbackIcon()}
				<Icon icon="sports_esports" size="xl" class="text-base-content/30" />
			{/snippet}
		</UpdateFeedHero>
	{/key}

	{#key routeSteamAppId}
		<svelte:boundary>
			{@const rawNews = await getGameNews({ appid: routeSteamAppId, count: 10 })}
			{@const news = parseNews(rawNews, routeSteamAppId)}
			{@const selectedNews =
				news.newsitems.find((newsItem) => newsItem.gid === selectedNewsId) ??
				news.newsitems[0] ??
				null}
			{@const navItems = news.newsitems.map((newsItem): UpdateFeedPostListItem => ({
				id: newsItem.gid,
				title: newsItem.title,
				dateLabel: formatNewsDate(newsItem.date),
				isSelected: selectedNews?.gid === newsItem.gid
			}))}

			<div class="grid min-h-0 gap-3 sm:gap-4 lg:grid-cols-4">
				<UpdateFeedPostList
					title="Posts"
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
									{@attach carouselNav}
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
	{/key}
</div>
