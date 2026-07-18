<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import Portal from '$lib/components/common-ui/Portal.svelte';
	import { createFloating } from '$lib/components/common-ui/floating/floating.svelte';
	import { flip, offset, shift } from '@floating-ui/dom';
	import { isNodeSelection, posToDOMRect, type Editor } from '@tiptap/core';
	import type { Attachment } from 'svelte/attachments';
	import { linkProtocols, normalizeUrl } from './TipTapTypes';

	type Props = {
		editor: Editor;
		revision: number;
	};

	type ActiveKey = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link';
	type MarkButton = {
		id: string;
		label: string;
		icon: string;
		run: () => void;
		activeKey: ActiveKey;
	};

	let { editor, revision }: Props = $props();

	let pointerDown = $state(false);
	let editorFocused = $state(false);
	let focusInsideMenu = $state(false);
	let dismissedKey = $state<string | null>(null);
	let linkEditKey = $state<string | null>(null);
	let linkValue = $state('');

	const focusLinkInput: Attachment<HTMLInputElement> = (node) => {
		node.focus();
		node.select();
	};

	const markButtons: MarkButton[] = [
		{
			id: 'bold',
			label: 'Bold',
			icon: 'format_bold',
			run: () => editor.chain().focus().toggleBold().run(),
			activeKey: 'bold'
		},
		{
			id: 'italic',
			label: 'Italic',
			icon: 'format_italic',
			run: () => editor.chain().focus().toggleItalic().run(),
			activeKey: 'italic'
		},
		{
			id: 'underline',
			label: 'Underline',
			icon: 'format_underlined',
			run: () => editor.chain().focus().toggleUnderline().run(),
			activeKey: 'underline'
		},
		{
			id: 'strike',
			label: 'Strikethrough',
			icon: 'strikethrough_s',
			run: () => editor.chain().focus().toggleStrike().run(),
			activeKey: 'strike'
		},
		{
			id: 'code',
			label: 'Inline code',
			icon: 'code',
			run: () => editor.chain().focus().toggleCode().run(),
			activeKey: 'code'
		}
	];

	function selectionKey(): string {
		const { from, to } = editor.state.selection;
		return `${from}:${to}`;
	}

	// `void revision` subscribes each derived to the editor's transaction counter,
	// since TipTap state is not otherwise reactive.
	const selectionKeyValue = $derived.by(() => {
		void revision;
		return selectionKey();
	});

	const activeState = $derived.by<Record<ActiveKey, boolean>>(() => {
		void revision;
		return {
			bold: editor.isActive('bold'),
			italic: editor.isActive('italic'),
			underline: editor.isActive('underline'),
			strike: editor.isActive('strike'),
			code: editor.isActive('code'),
			link: editor.isActive('link')
		};
	});

	const linkActive = $derived(activeState.link);

	const open = $derived.by(() => {
		void revision;

		if (!editor.isEditable) return false;

		const { selection } = editor.state;
		if (selection.empty) return false;
		if (isNodeSelection(selection)) return false;
		if (editor.isActive('codeBlock')) return false;
		if (pointerDown) return false;
		if (dismissedKey === selectionKeyValue) return false;

		return editorFocused || focusInsideMenu;
	});

	// Scoped to the selection it opened for, so any selection change reverts to the buttons.
	const showLink = $derived(open && linkEditKey === selectionKeyValue);

	const floating = createFloating({
		open: () => open,
		defaultPlacement: 'top',
		opts: () => ({
			placement: 'top',
			middleware: [offset(8), flip(), shift({ padding: 8 })]
		})
	});

	$effect(() => {
		const virtualReference = {
			getBoundingClientRect: () => {
				const { from, to } = editor.state.selection;
				return posToDOMRect(editor.view, from, to);
			},
			contextElement: editor.view.dom
		};

		floating.setReference(virtualReference);

		return () => floating.setReference(null);
	});

	// autoUpdate does not observe same-viewport selection moves; reposition on revision.
	$effect(() => {
		void revision;
		if (open) floating.updatePosition();
	});

	$effect(() => {
		const dom = editor.view.dom;
		const onFocus = () => (editorFocused = true);
		const onBlur = () => (editorFocused = false);
		const onPointerDown = () => (pointerDown = true);

		editor.on('focus', onFocus);
		editor.on('blur', onBlur);
		dom.addEventListener('pointerdown', onPointerDown);

		return () => {
			editor.off('focus', onFocus);
			editor.off('blur', onBlur);
			dom.removeEventListener('pointerdown', onPointerDown);
		};
	});

	function enterLinkMode(): void {
		const href = editor.getAttributes('link').href;
		linkValue = typeof href === 'string' ? href : '';
		linkEditKey = selectionKeyValue;
	}

	function applyLink(): void {
		const href = normalizeUrl(linkValue, {
			allowHash: true,
			allowRootRelative: true,
			allowedProtocols: linkProtocols
		});

		if (!href) {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
		} else {
			editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
		}

		linkEditKey = null;
	}

	function removeLink(): void {
		editor.chain().focus().extendMarkRange('link').unsetLink().run();
		linkEditKey = null;
	}

	function backToButtons(): void {
		linkEditKey = null;
		editor.commands.focus();
	}

	function isFormControlTarget(target: EventTarget | null): boolean {
		return target instanceof Element && Boolean(target.closest('input, textarea, select'));
	}

	function preserveEditorSelection(event: MouseEvent): void {
		if (isFormControlTarget(event.target)) return;

		event.preventDefault();
	}

	function handleMenuKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape') return;

		event.preventDefault();
		event.stopPropagation();

		if (showLink) {
			backToButtons();
			return;
		}

		dismissedKey = selectionKeyValue;
		editor.commands.focus();
	}

	function handleLinkKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			applyLink();
		}
	}
</script>

<svelte:window onpointerup={() => (pointerDown = false)} />

<Portal>
	{#if open}
		<div
			{...floating.floating({
				class:
					'bg-base-200 border-base-content/20 rounded-box z-50 flex items-center gap-1 border p-1 shadow-lg'
			})}
			role="toolbar"
			aria-label="Text formatting"
			tabindex="-1"
			onkeydowncapture={handleMenuKeydown}
			onfocusin={() => (focusInsideMenu = true)}
			onfocusout={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
					focusInsideMenu = false;
				}
			}}
			onmousedown={preserveEditorSelection}
		>
			{#if showLink}
				<div class="join">
					<button
						type="button"
						class="btn btn-soft join-item btn-sm btn-square"
						title="Back"
						aria-label="Back"
						onclick={backToButtons}
					>
						<Icon icon="arrow_back" size="sm" />
					</button>
					<input
						{@attach focusLinkInput}
						bind:value={linkValue}
						type="url"
						class="input input-sm w-64 join-item"
						placeholder="Paste or type a link"
						aria-label="Link URL"
						onkeydown={handleLinkKeydown}
					/>
					<button
						type="button"
						class="btn btn-soft join-item btn-sm btn-square"
						title="Apply link"
						aria-label="Apply link"
						onclick={applyLink}
					>
						<Icon icon="check" size="sm" />
					</button>
					{#if linkActive}
						<button
							type="button"
							class="btn btn-soft btn-sm join-item btn-square"
							title="Remove link"
							aria-label="Remove link"
							onclick={removeLink}
						>
							<Icon icon="link_off" size="sm" />
						</button>
					{/if}
				</div>
			{:else}
				<div class="join">
					{#each markButtons as button (button.id)}
						<button
							type="button"
							class={[
								'btn btn-sm join-item btn-square',
								activeState[button.activeKey] ? 'btn-primary' : 'btn-soft'
							]}
							title={button.label}
							aria-label={button.label}
							aria-pressed={activeState[button.activeKey]}
							onclick={button.run}
						>
							<Icon icon={button.icon} size="sm" />
						</button>
					{/each}
				</div>
				<span class="bg-base-content/15 mx-1 h-5 w-px self-center"></span>
				<button
					type="button"
					class={['btn btn-sm btn-square', linkActive ? 'btn-primary' : 'btn-soft']}
					title="Link"
					aria-label="Link"
					aria-pressed={linkActive}
					onclick={enterLinkMode}
				>
					<Icon icon="link" size="sm" />
				</button>
			{/if}
		</div>
	{/if}
</Portal>
