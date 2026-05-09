<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import type { ISteamAppNews, ISteamNewsItem } from '$lib/models/Steam';
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

	function openSteamNews(url: string): void {
		window.open(url, '_blank', 'noopener,noreferrer');
	}

	function useNextHeaderImage(): void {
		headerImageIndex += 1;
	}
</script>

<svelte:head>
	<title>{data.game.name}</title>
</svelte:head>

<div class="bg-base-100 min-h-full">
	{#await data.news}
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

		<div class="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
			<header class="card bg-base-200 border-base-300 overflow-hidden border shadow-sm">
				<div class="relative grid min-h-72 gap-0 lg:grid-cols-[minmax(320px,42%)_1fr]">
					<figure class="bg-base-300 relative min-h-56 overflow-hidden lg:min-h-full">
						{#if headerImageUrl}
							<img
								class="h-full w-full object-cover"
								src={headerImageUrl}
								alt=""
								loading="lazy"
								onerror={useNextHeaderImage}
							/>
						{:else}
							<div class="flex h-full min-h-56 items-center justify-center">
								<Icon icon="sports_esports" size="xl" class="text-base-content/30" />
							</div>
						{/if}
						<div
							class="from-base-200/0 via-base-200/30 to-base-200 absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r"
						></div>
					</figure>
					<div class="card-body relative z-10 gap-5 lg:-ml-20">
						<div class="flex flex-wrap items-center gap-2">
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
						</div>

						<div class="max-w-3xl">
							<h1 class="text-2xl leading-tight font-bold text-pretty md:text-3xl">
								{data.game.name}
							</h1>
							<p class="text-base-content/80 mt-2 max-w-2xl text-sm">
								Steam announcements and update posts collected into one readable feed.
							</p>
						</div>

						{#if selectedNews}
							<div
								class="stats stats-vertical bg-base-100 border-base-300 sm:stats-horizontal w-full border shadow-sm"
							>
								<div class="stat px-4 py-3">
									<div class="stat-title">Latest selected</div>
									<div class="stat-value text-lg">{formatNewsDate(selectedNews.date)}</div>
								</div>
								<div class="stat px-4 py-3">
									<div class="stat-title">Source</div>
									<div class="stat-value text-lg">{selectedNews.feedlabel || 'Steam'}</div>
								</div>
								<div class="stat px-4 py-3">
									<div class="stat-title">Author</div>
									<div class="stat-value text-lg">{selectedNews.author || 'Steam'}</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</header>

			<div class="grid min-h-0 gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
				<aside class="card bg-base-200 border-base-300 h-fit border shadow-sm lg:sticky lg:top-20">
					<div class="card-body gap-4 p-0">
						<div class="border-base-300 flex items-center justify-between gap-3 border-b px-4 py-3">
							<div>
								<h2 class="font-semibold">Posts</h2>
								<p class="text-base-content/60 text-sm">Newest Steam news from this app.</p>
							</div>
							<span class="badge badge-primary badge-soft">{news.newsitems.length}</span>
						</div>

						<nav class="max-h-[38rem] overflow-y-auto" aria-label="Steam news">
							<ul class="menu menu-sm w-full gap-1 p-2">
								{#each news.newsitems as newsItem, index (newsItem.gid)}
									<li>
										<button
											type="button"
											class={[
												'rounded-box items-start gap-3 py-3 text-left',
												isSelected(newsItem, index) ? 'menu-active' : ''
											]}
											aria-current={isSelected(newsItem, index) ? 'true' : undefined}
											onclick={() => (selectedId = newsItem.gid)}
										>
											<Icon icon={getPostIcon(newsItem, index)} size="sm" class="mt-0.5 shrink-0" />
											<span class="min-w-0 flex-1">
												<span class="text-xs opacity-60">{formatNewsDate(newsItem.date)}</span>
												<span class="mt-1 line-clamp-2 font-medium text-pretty">
													{newsItem.title}
												</span>
												<span class="mt-1 line-clamp-2 text-xs opacity-60">
													{getPostSummary(newsItem)}
												</span>
											</span>
										</button>
									</li>
								{:else}
									<div class="p-3">
										<div class="alert alert-info alert-soft">
											<Icon icon="info" />
											<span>Steam has not returned news for this game.</span>
										</div>
									</div>
								{/each}
							</ul>
						</nav>
					</div>
				</aside>

				<section class="min-w-0">
					{#if selectedNews}
						<article class="card bg-base-200 border-base-300 border shadow-sm">
							<div class="card-body gap-6 p-4 sm:p-6 lg:p-8">
								<header class="border-base-300 border-b pb-6">
									<div class="mb-3 flex flex-wrap items-center gap-2">
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
									</div>

									<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
										<h2 class="max-w-4xl text-2xl leading-tight font-bold text-pretty md:text-4xl">
											{selectedNews.title}
										</h2>
										{#if selectedNews.url}
											<button
												type="button"
												class="btn btn-primary btn-sm shrink-0 gap-2"
												onclick={() => openSteamNews(selectedNews.url)}
											>
												<Icon icon="open_in_new" size="sm" />
												Steam
											</button>
										{/if}
									</div>
								</header>

								<div
									class="prose prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content prose-a:link prose-a:link-primary max-w-none"
								>
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html sanitizeHtml(selectedNews.contents)}
								</div>
							</div>
						</article>
					{:else}
						<div class="hero bg-base-200 border-base-300 rounded-box min-h-96 border">
							<div class="hero-content text-center">
								<div class="max-w-md">
									<Icon icon="article" size="xl" class="text-base-content/40" />
									<h2 class="mt-4 text-xl font-semibold">No Steam posts found</h2>
									<p class="text-base-content/60 mt-2">
										Steam did not return announcements or update posts for this app.
									</p>
								</div>
							</div>
						</div>
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
