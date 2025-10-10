<script lang="ts">
	import '../app.css';
	// sort-ignore
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Icon, Menu, MenuItem, ScrollToTop, Swap } from '$lib/components/common-ui';
	import Dropdown from '$lib/components/common-ui/floating/Dropdown.svelte';
	import NavbarSearch from '$lib/components/common-ui/NavbarSearch.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import { setApiContext } from '$lib/contexts/ApiContext.svelte';
	import { flip, shift } from '@skeletonlabs/floating-ui-svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	setApiContext();

	let lightModeEnabled = $state(false);
	let theme = $derived(lightModeEnabled ? 'light' : 'dark');
	let dropdownOpen = $state(false);

	$effect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	});
</script>

<div class="flex h-full w-full flex-col">
	<Navbar class="bg-base-200 grow-0 gap-4">
		{#snippet start()}
			<Dropdown
				open={dropdownOpen}
				opts={{
					middleware: [shift({ padding: 10 }), flip()]
				}}
				onDismiss={() => (dropdownOpen = false)}
			>
				{#snippet activator(floating, interactions)}
					<div
						bind:this={floating.elements.reference}
						{...interactions.getReferenceProps({
							class: 'btn-circle btn-ghost btn-sm btn'
						})}
					>
						<Swap effect="swap-rotate" offIcon="menu" onIcon="close" bind:checked={dropdownOpen} />
					</div>
				{/snippet}
				<Menu class="rounded-box border-base-content/20 bg-base-100 w-48 border">
					<MenuItem href="/">
						<Icon icon="home" />
						Home
					</MenuItem>
					<MenuItem href="/about">
						<Icon icon="info" />
						About
					</MenuItem>
					<MenuItem href="/contact">
						<Icon icon="mail" />
						Contact
					</MenuItem>
				</Menu>
			</Dropdown>
			<a class="btn btn-ghost text-xl font-bold" href={resolve('/')}>PatchHub</a>
		{/snippet}
		{#snippet center()}
			<NavbarSearch />
		{/snippet}
		{#snippet end()}
			<label class="swap swap-rotate">
				<input
					id="theme-toggle"
					type="checkbox"
					bind:checked={lightModeEnabled}
					value="light"
					class="theme-controller"
				/>
				<Icon icon="light_mode" class="swap-on" />
				<Icon icon="dark_mode" class="swap-off" />
			</label>
			{#if page.data.user}
				<Icon icon="person" />
				{page.data.user.username}
				<Button text="Logout" class="btn-primary btn-sm" onclick={() => goto(resolve('/logout'))} />
			{:else if page.url.pathname !== '/login'}
				<Button text="Login" class="btn-primary btn-sm" onclick={() => goto(resolve('/login'))} />
			{/if}
		{/snippet}
	</Navbar>
	<ScrollToTop />
	{@render children()}
</div>
