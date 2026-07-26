<script lang="ts">
	import { page } from '$app/state';
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
	import type { ISteamAppNews, ISteamNewsItem } from '$lib/models/Steam';
	import { getGameNews, getSteamHeaderImage } from '$lib/remote/games.remote';
	import { BBCodeService } from '$lib/services/BBCodeService';
	import { getDefaultSteamHeaderImageUrl } from '$lib/util/SteamAssets';
	import { getSteamStoreUrl } from '$lib/util/SteamRoute';
	import { formatFeedDate } from '$lib/util/time';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let selectedNewsId = $state<string | null>(null);
	let headerImageOverride = $state<{ appid: number; url: string | null } | null>(null);

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

	const currentUser = getCurrentUser();
	const favorites = useFavorites();
	const externalItemId = $derived(game?.externalItemId ?? null);

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
		return formatFeedDate(timestamp * 1000);
	}

	function getArticleMeta(newsItem: ISteamNewsItem): UpdateFeedMetaItem[] {
		return [{ label: 'Published', value: formatNewsDate(newsItem.date) }];
	}

	function getArticleBadges(newsItem: ISteamNewsItem): UpdateFeedBadge[] {
		if (!newsItem.tags?.includes('patchnotes')) return [];
		return [{ label: 'Patch notes' }];
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
		await scrollArticleIntoView(articleSectionId);
	}
</script>

<Seo
	title={game?.name ?? 'PatchHub'}
	description={game
		? `${game.name} patch notes, updates, and announcements | Tracked on PatchHub`
		: undefined}
	image={game ? getDefaultSteamHeaderImageUrl(game.appid) : undefined}
/>

<div class="mx-auto flex min-h-full w-full max-w-6xl flex-col pb-4 sm:gap-4 sm:p-4">
	{#snippet newsSkeleton()}
		<div
			class={updateFeedGridClass}
			role="status"
			aria-label="Loading Steam posts"
			aria-busy="true"
		>
			<div class="skeleton h-14 w-full md:h-64"></div>
			<div class="skeleton min-h-96 w-full"></div>
		</div>
	{/snippet}

	{#key routeSteamAppId}
		<UpdateFeedHero
			title={isLoadingRouteSteamGame || !game ? 'Loading Steam game' : game.name}
			imageUrl={isLoadingRouteSteamGame || !game ? null : getHeaderImageUrl(game.appid)}
			loading={isLoadingRouteSteamGame}
			onimageerror={resolveHeaderImage}
		>
			{#snippet fallbackIcon()}
				<Icon icon="sports_esports" size="xl" class="text-base-content/30" />
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

			{#snippet actions()}
				{#if game}
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={getSteamStoreUrl(game.appid)}
						class="btn btn-sm btn-soft btn-primary"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon icon="open_in_new" size="sm" />
						View on Steam
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			{/snippet}
		</UpdateFeedHero>
	{/key}

	{#key routeSteamAppId}
		<svelte:boundary>
			{@const rawNews = await getGameNews({ appid: routeSteamAppId })}
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

			<div class={updateFeedGridClass}>
				<UpdateFeedPostList
					title="Posts"
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
							badges={getArticleBadges(selectedNews)}
							meta={getArticleMeta(selectedNews)}
						>
							<UpdateFeedContent html={selectedNews.contents} />
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
				<div class="alert alert-error shadow-sm max-sm:mx-4">
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
