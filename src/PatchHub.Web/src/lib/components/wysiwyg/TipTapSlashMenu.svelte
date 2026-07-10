<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import Portal from '$lib/components/common-ui/Portal.svelte';
	import { createFloating } from '$lib/components/common-ui/floating/floating.svelte';
	import { flip, offset, shift, type ReferenceElement } from '@floating-ui/dom';
	import type { Attachment } from 'svelte/attachments';
	import type { SlashCommandItem, SlashCommandSuggestionProps } from './TipTapTypes';

	let activeProps = $state.raw<SlashCommandSuggestionProps | null>(null);
	let selectedIndex = $state(0);

	const items = $derived(activeProps?.items ?? []);
	const open = $derived(activeProps !== null && items.length > 0);
	const selectedItem = $derived(items[selectedIndex]);

	const floating = createFloating({
		open: () => open,
		defaultPlacement: 'bottom-start',
		opts: () => ({
			placement: 'bottom-start',
			middleware: [offset(4), flip(), shift({ padding: 8 })]
		})
	});

	function syncReference(props: SlashCommandSuggestionProps): void {
		const reference: ReferenceElement = {
			getBoundingClientRect: () => props.clientRect?.() ?? new DOMRect(),
			contextElement: props.editor.view.dom
		};

		floating.setReference(reference);
		floating.updatePosition();
	}

	function clampSelectedIndex(nextItems: SlashCommandItem[], preferredId?: string): number {
		if (nextItems.length === 0) return 0;
		if (!preferredId) return 0;

		const preferredIndex = nextItems.findIndex((item) => item.id === preferredId);
		return preferredIndex === -1 ? 0 : preferredIndex;
	}

	export function start(props: SlashCommandSuggestionProps): void {
		if (props.items.length === 0) {
			exit();
			return;
		}

		activeProps = props;
		selectedIndex = 0;
		syncReference(props);
	}

	export function update(props: SlashCommandSuggestionProps): void {
		if (props.items.length === 0) {
			exit();
			return;
		}

		const preferredId = selectedItem?.id;
		activeProps = props;
		selectedIndex = clampSelectedIndex(props.items, preferredId);
		syncReference(props);
	}

	export function keydown(event: KeyboardEvent): boolean {
		if (!activeProps || items.length === 0) return false;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = (selectedIndex + 1) % items.length;
			return true;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = (selectedIndex + items.length - 1) % items.length;
			return true;
		}

		if (event.key === 'Enter' || event.key === 'Tab') {
			event.preventDefault();
			if (selectedItem) selectItem(selectedItem);
			return true;
		}

		if (event.key === 'Escape') {
			exit();
			return false;
		}

		return false;
	}

	export function exit(): void {
		activeProps = null;
		selectedIndex = 0;
		floating.setReference(null);
	}

	function selectItem(item: SlashCommandItem): void {
		activeProps?.command(item);
		exit();
	}

	// Scrolls the menu's own list only — scrollIntoView would also scroll the page
	// while the floating element is still unpositioned at the top of the document.
	function scrollSelectedIntoView(itemId: string): Attachment<HTMLButtonElement> {
		return (node) => {
			$effect(() => {
				if (selectedItem?.id !== itemId) return;

				const list = node.closest('ul');
				if (!list) return;

				const listRect = list.getBoundingClientRect();
				const nodeRect = node.getBoundingClientRect();
				if (nodeRect.top < listRect.top) {
					list.scrollTop += nodeRect.top - listRect.top;
				} else if (nodeRect.bottom > listRect.bottom) {
					list.scrollTop += nodeRect.bottom - listRect.bottom;
				}
			});
		};
	}
</script>

<Portal>
	{#if open}
		<div
			{...floating.floating({
				class:
					'tiptap-slash-menu bg-base-100 border-base-content/20 rounded-box z-50 w-56 border p-1 shadow-lg'
			})}
			onmousedown={(event) => event.preventDefault()}
		>
			<ul
				class="menu menu-sm w-full overflow-y-auto p-0"
				style:max-height="min(18rem, 40vh)"
				aria-label="Blocks"
			>
				{#each items as item, index (item.id)}
					<li>
						<button
							{@attach scrollSelectedIntoView(item.id)}
							type="button"
							tabindex="-1"
							class={[selectedItem?.id === item.id && 'bg-base-200']}
							onpointerenter={() => (selectedIndex = index)}
							onclick={() => selectItem(item)}
						>
							<Icon icon={item.icon} size="sm" class="text-base-content/60" />
							<span>{item.label}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</Portal>
