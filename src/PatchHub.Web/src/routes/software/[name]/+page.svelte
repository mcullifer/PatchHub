<script lang="ts">
	import Card from '$lib/components/common-ui/Card.svelte';
	import Menu from '$lib/components/common-ui/Menu.svelte';
	import MenuItem from '$lib/components/common-ui/MenuItem.svelte';
	import { FeedItem } from '@rowanmanning/feed-parser/lib/feed/item/base';
	import DOMPurify from 'dompurify';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let selected = $state<FeedItem | null>(data.news.items[0] ?? null);
</script>

<div class="flex flex-col gap-2 overflow-y-auto p-4 sm:flex-row">
	<Card class="h-full max-w-sm overflow-auto bg-base-200">
		{#snippet title()}{data.softwareName}{/snippet}
		<Menu class="menu-lg p-0">
			{#each data.news.items as newsItem}
				<MenuItem
					class={{ active: selected?.id === newsItem.id }}
					onclick={() => (selected = newsItem)}
				>
					<div class="text-pretty">
						<p class="text-sm font-light">
							{new Date(newsItem.published ?? 0 * 1000).toLocaleDateString()}
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
		<div class="prose h-fit max-w-3xl p-4">
			<h1>{selected.title}</h1>
			<address class="author">Author: <b>{selected.authors[0] ?? 'None specified'}</b></address>
			<article>
				{#if selected.content !== null}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html DOMPurify.sanitize(selected.content)}
				{:else}
					<p>
						The source did not provide any content to display. You can read the original post
						<a href={selected.url} class="link-hover link">here</a>.
					</p>
				{/if}
			</article>
		</div>
	{/if}
</div>
