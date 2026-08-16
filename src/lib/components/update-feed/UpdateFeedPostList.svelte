<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
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

	let sheet = $state<HTMLDialogElement | null>(null);

	const selectedItem = $derived(items.find((item) => item.isSelected) ?? items[0] ?? null);

	function selectItem(id: string): void {
		sheet?.close();
		onselect(id);
	}
</script>

{#snippet postItems(padding: string)}
	{#each items as item (item.id)}
		<button
			type="button"
			class={[
				'flex flex-col items-start gap-0.5 border-l-2 text-left transition-colors',
				padding,
				item.isSelected ? 'border-primary bg-base-200' : 'hover:bg-base-200/60 border-transparent'
			]}
			onclick={() => selectItem(item.id)}
		>
			<time class="text-base-content/50 text-xs">{item.dateLabel}</time>
			<span class="text-sm font-medium">{item.title}</span>
			{#if item.badgeLabel}
				<span class="badge badge-soft badge-info badge-xs">{item.badgeLabel}</span>
			{/if}
		</button>
	{/each}
{/snippet}

<aside class="sticky top-16 z-30 h-fit min-w-0 md:top-20">
	{#if selectedItem}
		<div class="px-4 py-3 md:hidden">
			<button
				type="button"
				class="bg-base-100/85 border-base-content/20 rounded-box flex w-full items-center gap-3 border px-4 py-3 text-left shadow-lg backdrop-blur"
				onclick={() => sheet?.showModal()}
			>
				<div class="min-w-0 flex-1">
					<span class="text-base-content/50 block text-xs font-semibold tracking-wide uppercase">
						{title} · {items.length}
					</span>
					<span class="block truncate font-medium">{selectedItem.title}</span>
				</div>
				<time class="text-base-content/50 shrink-0 text-xs">{selectedItem.dateLabel}</time>
				<Icon icon="expand_more" class="shrink-0 opacity-60" />
			</button>
		</div>
	{/if}

	<div class="max-md:hidden">
		<div class="flex items-baseline justify-between px-3 pb-2">
			<h2 class="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{title}</h2>
			<span class="text-base-content/40 text-xs">{items.length}</span>
		</div>

		{#if selectedItem}
			<nav class="flex max-h-[70vh] flex-col overflow-y-auto" aria-label={ariaLabel}>
				{@render postItems('rounded-r-lg px-3 py-2.5')}
			</nav>
		{:else}
			<p class="text-base-content/70 px-3">{emptyMessage}</p>
		{/if}
	</div>
</aside>

<dialog bind:this={sheet} class="modal modal-bottom md:hidden">
	<div class="modal-box flex max-h-[75vh] flex-col overflow-hidden px-0">
		<div class="flex shrink-0 items-baseline justify-between px-5 pb-3">
			<h2 class="text-lg font-semibold">{title}</h2>
			<span class="text-base-content/50 text-sm">{items.length}</span>
		</div>
		<nav class="flex min-h-0 flex-col overflow-y-auto" aria-label={ariaLabel}>
			{@render postItems('px-5 py-3')}
		</nav>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
