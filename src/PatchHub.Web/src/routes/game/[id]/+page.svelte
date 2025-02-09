<script lang="ts">
	import { page } from '$app/state';
	import Card from '$lib/components/common-ui/Card.svelte';
	import Menu from '$lib/components/common-ui/Menu.svelte';
	import MenuItem from '$lib/components/common-ui/MenuItem.svelte';
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
		<Card class="h-[48rem] max-w-sm overflow-auto bg-base-200">
			{#snippet title()}{data.gameName}{/snippet}
			<Menu class="menu-lg p-0">
				{#each news.newsitems as newsItem}
					<MenuItem
						class={{ active: selected?.gid === newsItem.gid }}
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
			<div class="prose max-w-3xl p-4">
				<h1>{selected.title}</h1>
				<address class="author">Author: <b>{selected.author}</b></address>
				<article>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html DOMPurify.sanitize(selected.contents ?? '')}
				</article>
			</div>
		{/if}
	{/await}
</div>
