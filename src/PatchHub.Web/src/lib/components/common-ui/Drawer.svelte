<script lang="ts">
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import type { Snippet } from 'svelte';

	type drawerItem = {
		label: string;
		icon: string;
		href: string;
	};

	let {
		children,
		content,
		title,
		items,
		class: classNames
	}: {
		children?: Snippet;
		content?: Snippet;
		title: Snippet;
		items: drawerItem[];
		class?: string;
	} = $props();
</script>

<div class="drawer">
	<input id="my-drawer" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content">
		<!-- Page content here -->
		{#if children}
			{@render children()}
		{:else if content}
			{@render content()}
		{/if}
	</div>
	<div class="drawer-side {classNames}">
		<label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
		<ul class="menu min-h-full w-80 bg-base-200 pt-0 text-base-content">
			<div class="navbar gap-2">
				{@render title()}
			</div>
			{#each items as item}
				<li>
					{#if item.href != '' && item.href != undefined}
						<a href={item.href}>
							<Icon icon={item.icon} />
							<span class="font-medium">
								{item.label}
							</span>
							<!-- <Label class="font-medium" text={item.label} icon={item.icon} /> -->
						</a>
					{:else}
						{item.label}
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</div>
