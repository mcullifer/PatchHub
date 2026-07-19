<script lang="ts">
	import { page } from '$app/state';

	type SeoProps = {
		/** Page title, used for `<title>`, `og:title` and `twitter:title`. */
		title: string;
		/** One-sentence summary for search results and link previews. */
		description?: string;
		/** Absolute canonical URL. Defaults to the current path on this origin. */
		url?: string;
		/** Absolute URL of the share image (banner/preview). */
		image?: string;
		/** Whether crawlers should skip indexing this page. */
		noindex?: boolean;
		/** Open Graph object type. */
		type?: 'website' | 'article';
	};

	let { title, description, url, image, noindex = false, type = 'website' }: SeoProps = $props();

	const canonical = $derived(url ?? `${page.url.origin}${page.url.pathname}`);
	const twitterCard = $derived(image ? 'summary_large_image' : 'summary');
</script>

<svelte:head>
	<title>{title}</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}
	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<link rel="canonical" href={canonical} />
	{/if}

	<meta property="og:site_name" content="PatchHub" />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={title} />
	<meta property="og:url" content={canonical} />
	{#if description}
		<meta property="og:description" content={description} />
	{/if}
	{#if image}
		<meta property="og:image" content={image} />
	{/if}

	<meta name="twitter:card" content={twitterCard} />
	<meta name="twitter:title" content={title} />
	{#if description}
		<meta name="twitter:description" content={description} />
	{/if}
	{#if image}
		<meta name="twitter:image" content={image} />
	{/if}
</svelte:head>
