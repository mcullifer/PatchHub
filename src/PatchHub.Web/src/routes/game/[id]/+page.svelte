<script lang="ts">
	import { page } from '$app/stores';
	import type { ISteamAppNews, ISteamNewsItem } from '$lib/models/Steam';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let noNews: ISteamAppNews = {
		appid: parseInt($page.params.id),
		newsitems: [],
		count: 0
	};
	let selected = $state<ISteamNewsItem | null>(null);

	const steamClanImgUrl = 'https://clan.akamai.steamstatic.com/images/';
	export function bbcodeToHtml(bbcode: string): string {
		const BBToHTML: { [key: string]: string } = {
			'[b]': '<b>',
			'[/b]': '</b>',
			'[i]': '<i>',
			'[/i]': '</i>',
			'[u]': '<u>',
			'[/u]': '</u>',
			'[url=': '<a href="',
			'[/url]': '</a>',
			'[img]': '<img src="',
			'[/img]': '"/>',
			'[list]': '<ul>',
			'[/list]': '</ul>',
			'[olist]': '<ol>',
			'[/olist]': '</ol>',
			'[*]': '<li>',
			'[quote]': '<blockquote>',
			'[/quote]': '</blockquote>',
			'[code]': '<code>',
			'[/code]': '</code>',
			'[hr]': '<hr>',
			'[/hr]': '',
			'[h1]': '<h1>',
			'[/h1]': '</h1>',
			'[h2]': '<h2>',
			'[/h2]': '</h2>',
			'[h3]': '<h3>',
			'[/h3]': '</h3>',
			'[h4]': '<h4>',
			'[/h4]': '</h4>',
			'[h5]': '<h5>',
			'[/h5]': '</h5>'
		};

		let html = bbcode;
		for (let bb in BBToHTML) {
			html = html.replaceAll(bb, BBToHTML[bb]);
		}

		// Handle special cases like [url=...]...[/url]
		html = html.replace(/\[url=(.*?)\](.*?)\[\/url\]/g, '<a href="$1">$2</a>');

		// Handle list items and ensure closing </li> tags
		html = html.replace(/\[\*\](.*?)($|\[\*\]|\[\/list\])/g, '<li>$1</li>$2');

		// Handle [previewyoutube=...]...[/previewyoutube] with a preview
		html = html.replace(
			/\[previewyoutube=(.*?);.*?\](.*?)\[\/previewyoutube\]/g,
			(match, videoId) => {
				const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
				const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
				return `
				<div>
				<a href="${videoUrl}" target="_blank">
					<img src="${thumbnailUrl}" alt="YouTube Video Thumbnail" style="margin-left: auto;margin-right:auto;">
				</a>
				</div>
			`;
			}
		);

		html = html.replaceAll('{STEAM_CLAN_IMAGE}', steamClanImgUrl);
		return html;
	}

	async function cleanPosts() {
		let news = await data.news;
		if (!news) return noNews;

		// I think the real strat might be to first look for all special case
		// nodes like [url=] or [img] that have weird syntax and replace those
		// then all the easy ones can do a straight replacement like [b] to <b>

		// There is still edge cases (from incorrectly written BBCode) where
		// they don't use a closing tag.
		for (let i = 0; i < news.newsitems.length; i++) {
			news.newsitems[i].contents = bbcodeToHtml(news.newsitems[i].contents);
		}
		selected = news.newsitems[0];
		return news;
	}
</script>

<div class="prose m-4 mx-auto w-full">
	<h1 class="text-center">{data.gameName}</h1>
</div>
<div class="mx-auto w-full max-w-4xl gap-2">
	{#await cleanPosts() then news}
		<div class="flex gap-2 overflow-auto whitespace-nowrap">
			{#each news.newsitems as newsItem}
				<div class="max-w-96 shrink-0 whitespace-break-spaces rounded-lg bg-base-300 p-2 shadow-lg">
					<p>{new Date(newsItem.date * 1000).toLocaleDateString()}</p>
					<h4 class="block">{newsItem.title}</h4>
				</div>
			{:else}
				<div>No posts</div>
			{/each}
		</div>

		<div class="prose mx-auto mt-4 w-2/3">
			{@html selected?.contents}
		</div>
	{/await}
</div>
