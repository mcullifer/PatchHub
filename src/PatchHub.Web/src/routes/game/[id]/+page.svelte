<script lang="ts">
	import { page } from '$app/stores';
	import { BBToHTML } from '$lib/models/BBCode';
	import type { ISteamAppNews } from '$lib/models/Steam';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let noNews: ISteamAppNews = {
		appid: parseInt($page.params.id),
		newsitems: [],
		count: 0
	};
	async function cleanPosts() {
		let news = await data.news;
		if (!news) return noNews;

		// I think the real strat might be to first look for all special case
		// nodes like [url=] or [img] that have weird syntax and replace those
		// then all the easy ones can do a straight replacement like [b] to <b>

		// There is still edge cases (from incorrectly written BBCode) where
		// they don't use a closing tag.
		for (let i = 0; i < news.newsitems.length; i++) {
			let newsItem = news.newsitems[i];
			for (let bb of Object.keys(BBToHTML)) {
				newsItem.contents = newsItem.contents.replaceAll(bb, BBToHTML[bb]);
			}
			news.newsitems[i] = newsItem;
		}
		return news;
	}
</script>

<div class="prose mx-auto max-w-xl">
	<h1 class="text-center text-xl font-bold">{data.gameName}</h1>

	{#await cleanPosts() then news}
		{#each news.newsitems as newsItem}
			<h3>{newsItem.title}</h3>
			{@html newsItem.contents}
		{:else}
			<div>No posts</div>
		{/each}
	{/await}
</div>
