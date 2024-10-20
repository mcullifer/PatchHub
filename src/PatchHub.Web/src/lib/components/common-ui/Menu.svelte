<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		class: classNames = ''
	}: {
		children: Snippet;
		class?: string;
	} = $props();
</script>

<ul class="menu {classNames}">
	{@render children()}
</ul>
