<script lang="ts">
	import { page } from '$app/state';
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

{#snippet newsCard(item: ISteamNewsItem)}
	<button
		class="card card-compact border-2 transition-colors duration-200 {selected?.gid === item.gid
			? 'border-primary'
			: 'border-transparent'}"
		onclick={() => (selected = item)}
	>
		<div class="card-body text-start">
			<p>{new Date(item.date * 1000).toLocaleDateString()}</p>
			<h2 class="card-title">{item.title}</h2>
		</div>
	</button>
{/snippet}

<div class="mx-auto flex h-full w-full gap-2 p-4 max-sm:flex-col">
	{#await cleanPosts() then news}
		<aside
			class="sticky left-0 top-4 flex h-[48rem] max-h-[48rem] w-max gap-2 overflow-y-auto rounded-lg border-[1px] border-neutral bg-base-300 p-4 sm:basis-1/4 sm:flex-col"
		>
			<div class="prose mx-auto w-full">
				<h1 class="text-center">{data.gameName}</h1>
			</div>
			<Menu>
				{#each news.newsitems as newsItem}
					<MenuItem>
						{@render newsCard(newsItem)}
					</MenuItem>
				{:else}
					<div class="prose text-center">
						<h3>No posts ☹️</h3>
					</div>
				{/each}
			</Menu>
		</aside>

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
