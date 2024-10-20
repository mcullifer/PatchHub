<script lang="ts">
	import '../app.css';
	// sort-ignore
	import Drawer from '$lib/components/common-ui/Drawer.svelte';
	import Dropdown from '$lib/components/common-ui/Dropdown.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import Menu from '$lib/components/common-ui/Menu.svelte';
	import MenuItem from '$lib/components/common-ui/MenuItem.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	let dropdown = $state<Dropdown>();
</script>

{#snippet hamburgerAndTitle()}
	<label for="my-drawer" class="drawer-button btn btn-sm btn-circle btn-ghost">
		<Icon icon="menu" />
	</label>
	<a class="font-bold text-xl select-none" href="/">PatchHub</a>
{/snippet}

<Navbar class="bg-base-200 relative">
	{#snippet start()}
		{@render hamburgerAndTitle()}
	{/snippet}
	{#snippet center()}
		<Dropdown bind:this={dropdown} class="w-full max-w-sm">
			{#snippet activator()}
				<label class="input input-bordered flex items-center gap-2">
					<Icon icon="search" />
					<input type="text" placeholder="Search" />
				</label>
			{/snippet}
			{#snippet content()}
				<Menu>
					<MenuItem href="/">Test</MenuItem>
					<MenuItem href="/">Test</MenuItem>
					<MenuItem href="/">Test</MenuItem>
					<MenuItem href="/">Test</MenuItem>
					<MenuItem href="/">Test</MenuItem>
				</Menu>
			{/snippet}
		</Dropdown>
	{/snippet}
	{#snippet end()}
		<Icon icon="person" />
	{/snippet}
</Navbar>
<Drawer
	items={[
		{ label: 'Home', icon: 'home', href: '/' },
		{ label: 'About', icon: 'info', href: '/about' },
		{ label: 'Contact', icon: 'mail', href: '/contact' }
	]}
>
	{#snippet title()}
		{@render hamburgerAndTitle()}
	{/snippet}
	<!-- <Button icon="menu" class="btn-circle btn-ghost btn-sm" /> -->
	{@render children()}
</Drawer>
