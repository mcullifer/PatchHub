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
		// add support fort [td] and [tr] tags and [table] tags
		BBToHTML['[table]'] = '<table>';
		BBToHTML['[/table]'] = '</table>';
		BBToHTML['[td]'] = '<td>';
		BBToHTML['[/td]'] = '</td>';
		BBToHTML['[tr]'] = '<tr>';
		BBToHTML['[/tr]'] = '</tr>';

		let html = bbcode;
		for (let bb in BBToHTML) {
			html = html.replaceAll(bb, BBToHTML[bb]);
		}

		// Handle special cases like [url=...]...[/url]
		html = html.replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1">$2</a>');

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
				</div>`;
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
	// make scroll to top button
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
			<div class="flex flex-wrap gap-2">
				{#each item.tags as tag}
					<div class="badge badge-primary uppercase">{tag.replace('_', ' ')}</div>
				{/each}
			</div>
		</div>
	</button>
{/snippet}

<div class="mx-auto flex w-full gap-2 p-4 max-sm:flex-col">
	{#await cleanPosts() then news}
		<div class="flex h-fit w-max gap-2 rounded-lg bg-base-300 p-4 sm:basis-1/4 sm:flex-col">
			<div class="prose mx-auto w-full">
				<h1 class="text-center">{data.gameName}</h1>
			</div>
			{#each news.newsitems as newsItem}
				{@render newsCard(newsItem)}
			{:else}
				<div>No posts</div>
			{/each}
		</div>

		{#key selected}
			<div class="prose max-w-3xl p-4">
				<h1 class="text-center">{selected?.title}</h1>
				{@html selected?.contents}
			</div>
		{/key}
	{/await}
</div>
