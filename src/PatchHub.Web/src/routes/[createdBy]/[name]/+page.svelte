<script lang="ts">
	import { Card, Menu, MenuItem } from '$lib/components/common-ui';
	import Article from '$lib/components/layout/Article.svelte';
	import TipTap from '$lib/components/wysiwyg/TipTap.svelte';
	import type { ISteamAppNews, ISteamNewsItem } from '$lib/models/Steam';
	import { BBCodeService } from '$lib/services/BBCodeService';
	import DOMPurify from 'dompurify';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let app = data.catalogItem;
	let noNews: ISteamAppNews = {
		appid: parseInt(app?.externalId ?? '0'),
		newsitems: [],
		count: 0
	};
	let selected = $state<ISteamNewsItem | null>(null);

	async function cleanNewsPosts() {
		let news = await data.news;
		if (!news) return noNews;
		for (let i = 0; i < news.newsitems.length; i++) {
			news.newsitems[i].contents = BBCodeService.bbcodeToHtml(news.newsitems[i].contents);
			if (i === 0) {
				console.log(news.newsitems[i].contents);
			}
		}
		selected = news.newsitems[0];
		return news;
	}
</script>

<svelte:head>
	<title>{data.catalogItem.name}</title>
</svelte:head>

<div class="flex flex-col gap-2 overflow-y-auto p-4 sm:flex-row">
	{#if data.catalogItem.type === 'game'}
		{#await cleanNewsPosts() then news}
			<Card class="bg-base-200 h-full max-w-sm overflow-auto">
				{#snippet title()}
					<div class="flex items-center gap-2">
						{data.catalogItem.name}
						<div class="badge badge-soft badge-info capitalize">{data.catalogItem.type}</div>
					</div>
				{/snippet}
				<Menu class="menu-lg p-0">
					{#each news.newsitems as newsItem (newsItem.gid)}
						<MenuItem
							class={{ 'menu-active': selected?.gid === newsItem.gid }}
							onclick={() => (selected = newsItem)}
						>
							<div class="text-pretty">
								<p class="text-sm font-light">
									{new Date(newsItem.date * 1000).toLocaleDateString()}
								</p>
								<p>{newsItem.title}</p>
							</div>
						</MenuItem>
					{:else}
						<div class="prose text-center">
							<h3>No posts ☹️</h3>
						</div>
					{/each}
				</Menu>
			</Card>
		{/await}
	{/if}
	{#if selected}
		<Article title={selected.title} author={selected.author}>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<!-- {@html DOMPurify.sanitize(selected.contents ?? '')} -->
			<TipTap content={DOMPurify.sanitize(selected.contents ?? '')} />
		</Article>
	{/if}
</div>
