<script module lang="ts">
	import type { Snippet } from 'svelte';

	export interface IArticleProps {
		title?: string;
		author: string;
		children: Snippet;
	}
</script>

<script lang="ts">
	let { title, author, children }: IArticleProps = $props();
</script>

<div class="prose h-fit w-full max-w-3xl p-4">
	<h1>{title}</h1>
	<address class="author">Author: <b>{author ?? 'None specified'}</b></address>
	<article>
		{@render children()}
	</article>
</div>
