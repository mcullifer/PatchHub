<script lang="ts">
	import Article from '$lib/components/layout/Article.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.item.name}</title>
</svelte:head>

<div class="p-4">
	<Article title={data.item.name} author={data.item.normalizedName}>
		<p class="text-base-content/70">PatchHub project details are not available yet.</p>
	</Article>
</div>
