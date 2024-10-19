<script lang="ts">
	import '../app.css';
	// force app.css to be at top
	import type { Snippet } from 'svelte';

	let {children}: {children: Snippet} = $props();
</script>

{@render children()}