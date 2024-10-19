<script lang="ts">
	import '../app.css';
	// sort-ignore
	import Drawer from '$lib/components/common-ui/Drawer.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<Navbar class="bg-base-200 relative">
	{#snippet start()}
		<label for="my-drawer" class="drawer-button btn btn-sm btn-circle">
			<Icon icon="menu" />
		</label>
		<div class="flex items-center gap-2">
			<h1 class="font-bold text-xl">PatchHub</h1>
		</div>
	{/snippet}
	{#snippet center()}
		<label class="input input-bordered flex items-center gap-2">
			<Icon icon="search" />
			<input type="text" placeholder="Search" />
		</label>
	{/snippet}
	{#snippet end()}
		<Icon icon="person" />
	{/snippet}
</Navbar>
<Drawer
	class="mt-16"
	items={[
		{ label: 'Home', icon: 'home', href: '/' },
		{ label: 'About', icon: 'info', href: '/about' },
		{ label: 'Contact', icon: 'mail', href: '/contact' }
	]}
>
	<!-- <Button icon="menu" class="btn-circle btn-ghost btn-sm" /> -->
	{@render children()}
</Drawer>
