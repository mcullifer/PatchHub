<script lang="ts">
	import { page } from '$app/state';
	import { Card, Menu, MenuItem } from '$lib/components/common-ui';
	import Article from '$lib/components/layout/Article.svelte';
	import type { ISteamAppNews, ISteamNewsItem } from '$lib/models/Steam';
	import { BBCodeService } from '$lib/services/BBCodeService';
	import DOMPurify from 'dompurify';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let noNews: ISteamAppNews = {
		appid: parseInt(page.params.id),
		newsitems: [],
		count: 0
	};
	let selected = $state<ISteamNewsItem | null>(null);

	async function cleanPosts() {
		let news = await data.news;
		if (!news) return noNews;
		for (let i = 0; i < news.newsitems.length; i++) {
			news.newsitems[i].contents = BBCodeService.bbcodeToHtml(news.newsitems[i].contents);
		}
		selected = news.newsitems[0];
		return news;
	}
</script>

<svelte:head>
	<title>{data.gameName}</title>
</svelte:head>

<div class="flex flex-col gap-2 overflow-y-auto p-4 sm:flex-row">
	{#await cleanPosts() then news}
		<Card class="bg-base-200 h-full max-w-sm overflow-auto">
			{#snippet title()}{data.gameName}{/snippet}
			<Menu class="menu-lg p-0">
				{#each news.newsitems as newsItem}
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

		{#if selected}
			<Article title={selected.title} author={selected.author}>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html DOMPurify.sanitize(selected.contents ?? '')}
			</Article>
		{/if}
	{/await}
</div>
