<script lang="ts">
	import { Icon, Menu } from '$lib/components/common-ui';
	import type { UpdateFeedPostListItem } from './UpdateFeedTypes';

	let {
		title,
		ariaLabel,
		items,
		emptyMessage,
		onselect
	}: {
		title: string;
		ariaLabel: string;
		items: UpdateFeedPostListItem[];
		emptyMessage: string;
		onselect: (id: string) => void;
	} = $props();

	const selectedItem = $derived(items.find((item) => item.isSelected) ?? items[0] ?? null);

	function selectItem(id: string): void {
		// The mobile dropdown is focus-based, so dropping focus closes it.
		(document.activeElement as HTMLElement | null)?.blur();
		onselect(id);
	}
</script>

{#snippet postItems()}
	{#each items as item (item.id)}
		<li>
			<button
				type="button"
				class={['flex flex-col items-start gap-1', item.isSelected && 'menu-active']}
				onclick={() => selectItem(item.id)}
			>
				<time class="text-xs opacity-60">{item.dateLabel}</time>
				<span class="font-medium">{item.title}</span>
			</button>
		</li>
	{/each}
{/snippet}

<aside class="h-fit min-w-0 lg:sticky lg:top-20">
	<!-- Mobile: a single full-width dropdown, no card chrome around it. -->
	{#if selectedItem}
		<nav class="dropdown w-full lg:hidden" aria-label={ariaLabel}>
			<div
				tabindex="0"
				role="button"
				class="btn btn-block border border-base-content/10 justify-between"
			>
				<span class="min-w-0 truncate">{selectedItem.dateLabel} — {selectedItem.title}</span>
				<Icon icon="expand_more" size="sm" class="shrink-0 opacity-60" />
			</div>
			<ul
				tabindex="-1"
				class="dropdown-content menu bg-base-100 rounded-box border-base-content/10 z-10 mt-2 max-h-80 w-full flex-nowrap overflow-y-auto border p-2 shadow-lg"
			>
				{@render postItems()}
			</ul>
		</nav>
	{/if}

	<div class="card card-sm bg-base-200 hidden lg:block shadow-lg">
		<div class="card-body">
			<div class="flex items-center justify-between gap-2">
				<h2 class="card-title">{title}</h2>
				<span class="badge badge-primary badge-soft">{items.length}</span>
			</div>

			{#if selectedItem}
				<nav class="max-h-[70vh] overflow-y-auto" aria-label={ariaLabel}>
					<Menu class="w-full p-0">
						{@render postItems()}
					</Menu>
				</nav>
			{:else}
				<p class="text-base-content/70">{emptyMessage}</p>
			{/if}
		</div>
	</div>
</aside>
