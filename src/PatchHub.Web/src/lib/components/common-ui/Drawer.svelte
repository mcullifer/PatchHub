<script lang="ts">
	import Label from '$lib/components/common-ui/Label.svelte';
	import type { Snippet } from 'svelte';

	type drawerItem = {
		label: string;
		icon: string;
		href: string;
	};

	let {
		children,
		items,
		class: classNames
	}: {
		children: Snippet;
		items: drawerItem[];
		class?: string;
	} = $props();
</script>

<div class="drawer">
	<input id="my-drawer" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content">
		<!-- Page content here -->
		{@render children()}
	</div>
	<div class="drawer-side {classNames}">
		<label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
		<ul class="menu bg-base-200 text-base-content min-h-full w-80">
			{#each items as item}
				<li>
					{#if item.href != '' && item.href != undefined}
						<a href={item.href}>
							<Label class="font-medium" text={item.label} icon={item.icon} />
						</a>
					{:else}
						{item.label}
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</div>
