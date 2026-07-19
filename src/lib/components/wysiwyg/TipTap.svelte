<script module lang="ts">
	import type {
		TipTapContent as TipTapContentType,
		TipTapJsonContent as TipTapJsonContentType,
		TipTapSavePayload as TipTapSavePayloadType
	} from './TipTapTypes';

	export type TipTapContent = TipTapContentType;
	export type TipTapJsonContent = TipTapJsonContentType;
	export type TipTapSavePayload = TipTapSavePayloadType;
</script>

<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import { offset } from '@floating-ui/dom';
	import { Editor, type Extensions } from '@tiptap/core';
	import DragHandle from '@tiptap/extension-drag-handle';
	import Image from '@tiptap/extension-image';
	import Link from '@tiptap/extension-link';
	import Placeholder from '@tiptap/extension-placeholder';
	import TextAlign from '@tiptap/extension-text-align';
	import { Selection } from '@tiptap/extensions';
	import StarterKit from '@tiptap/starter-kit';
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { createSlashCommandItems, SlashCommand } from './slashCommand';
	import TipTapBubbleMenu from './TipTapBubbleMenu.svelte';
	import TipTapImageDialog from './TipTapImageDialog.svelte';
	import TipTapSlashMenu from './TipTapSlashMenu.svelte';
	import TipTapToolbar from './TipTapToolbar.svelte';
	import type {
		TipTapContent as EditorContent,
		TipTapSavePayload as EditorSavePayload
	} from './TipTapTypes';

	type Props = {
		content?: EditorContent;
		editable?: boolean;
		placeholder?: string;
		onsave?: (content: EditorSavePayload) => void | Promise<void>;
	};

	const emptyEditorContent = {
		type: 'doc',
		content: [{ type: 'paragraph' }]
	} satisfies EditorContent;

	let {
		content = emptyEditorContent,
		editable = true,
		placeholder = 'Write patch notes...',
		onsave
	}: Props = $props();
	let editor = $state<Editor | null>(null);
	let toolbarRevision = $state(0);
	let contentErrorMessage = $state<string | null>(null);
	let appliedContent: EditorContent | null = null;
	let imageDialog = $state<TipTapImageDialog | null>(null);
	let slashMenu = $state<TipTapSlashMenu | null>(null);
	const slashCommandItems = createSlashCommandItems(openImageDialog);

	function createEditor(element: HTMLDivElement): Editor {
		const instance = new Editor({
			element,
			content,
			editable,
			enableContentCheck: true,
			extensions: createExtensions(placeholder),
			editorProps: {
				attributes: {
					class:
						'tiptap-editor patchhub-rich-text prose prose-sm sm:prose-base prose-a:link prose-a:link-primary prose-img:block prose-img:h-auto prose-img:max-w-full prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content w-full max-w-none outline-none'
				}
			},
			onContentError: ({ error }) => {
				contentErrorMessage = error.message;
			},
			onTransaction: ({ editor: instance }) => {
				if (instance.isEditable) {
					toolbarRevision += 1;
				}
			},
			onUpdate: ({ editor: instance }) => {
				// F1f: clear an orphaned drag handle once the doc is empty.
				if (instance.isEmpty) {
					instance.view.dispatch(instance.state.tr.setMeta('hideDragHandle', true));
				}
			}
		});

		appliedContent = content;
		return instance;
	}

	function buildPayload(instance: Editor): EditorSavePayload {
		return {
			json: instance.getJSON(),
			html: instance.getHTML(),
			text: instance.getText(),
			isEmpty: instance.isEmpty
		};
	}

	export function getPayload(): EditorSavePayload | null {
		if (!editor) return null;

		return buildPayload(editor);
	}

	function createExtensions(currentPlaceholder: string): Extensions {
		return [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3]
				},
				link: false
			}),
			Link.configure({
				autolink: true,
				defaultProtocol: 'https',
				linkOnPaste: true,
				openOnClick: 'whenNotEditable',
				HTMLAttributes: {
					class: 'link link-primary link-hover',
					rel: 'noopener noreferrer nofollow',
					target: '_blank'
				}
			}),
			TextAlign.configure({
				types: ['heading', 'paragraph']
			}),
			Selection,
			Placeholder.configure({
				placeholder: ({ node }) => {
					if (node.type.name === 'heading') {
						return `Heading ${node.attrs.level}`;
					}

					return currentPlaceholder;
				},
				showOnlyCurrent: true
			}),
			Image.configure({
				inline: false,
				allowBase64: false,
				resize: {
					enabled: true,
					directions: ['top', 'right', 'bottom', 'left'],
					minWidth: 80,
					minHeight: 80,
					alwaysPreserveAspectRatio: true
				},
				HTMLAttributes: {
					class: 'rounded-box border border-base-content/20'
				}
			}),
			DragHandle.configure({
				render: createDragHandle,
				computePositionConfig: {
					placement: 'left-start',
					middleware: [offset({ mainAxis: 6, crossAxis: 2 })]
				}
			}),
			SlashCommand.configure({
				items: () => slashCommandItems,
				onStart: (props) => slashMenu?.start(props),
				onUpdate: (props) => slashMenu?.update(props),
				onKeyDown: (event) => slashMenu?.keydown(event) ?? false,
				onExit: () => slashMenu?.exit()
			})
		];
	}

	function createDragHandle(): HTMLElement {
		const handle = document.createElement('div');
		handle.className = 'tiptap-drag-handle';
		handle.setAttribute('aria-hidden', 'true');
		handle.textContent = 'drag_indicator';
		handle.style.visibility = 'hidden';
		handle.style.pointerEvents = 'none';
		return handle;
	}

	// untrack: create the editor once on mount; content/editable/placeholder changes
	// are synced below rather than recreating the instance.
	const mountEditor: Attachment<HTMLDivElement> = (element) => {
		const instance = untrack(() => createEditor(element));
		editor = instance;

		return () => {
			instance.destroy();
			editor = null;
		};
	};

	function openImageDialog(): void {
		imageDialog?.open();
	}

	$effect(() => {
		if (!editor) return;
		if (editor.isEditable === editable) return;

		editor.setEditable(editable, false);
	});

	$effect(() => {
		if (!editor || content === appliedContent) return;

		appliedContent = content;
		editor.commands.setContent(content ?? emptyEditorContent, { emitUpdate: false });
		contentErrorMessage = null;
	});
</script>

<div class={['tiptap-shell']} data-editable={editable}>
	{#if editor && editable}
		<TipTapToolbar {editor} revision={toolbarRevision} {onsave} {getPayload} {openImageDialog} />
		<TipTapBubbleMenu {editor} revision={toolbarRevision} />
		<TipTapSlashMenu bind:this={slashMenu} />
		<TipTapImageDialog bind:this={imageDialog} {editor} />
	{/if}

	{#if contentErrorMessage}
		<div class="not-prose border-base-content/20 border-b p-3">
			<div class="alert alert-warning text-sm">
				<Icon icon="warning" />
				<p>Some editor content could not be loaded because it is not valid for this editor.</p>
			</div>
		</div>
	{/if}

	<div {@attach mountEditor} class="relative"></div>
</div>

<style lang="postcss">
	@reference '../../../app.css';

	:global(.tiptap-editor .is-empty[data-placeholder]::before) {
		color: color-mix(in oklch, currentColor 45%, transparent);
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	/* Unlayered :global rules beat Tailwind's utilities layer — required for these to
	   win over `prose`, unlike the dead app.css @layer overrides. */
	:global(.tiptap-editor p) {
		margin: 0 0 0.5rem;
		line-height: 1.6;
	}
	:global(.tiptap-editor h1) {
		margin: 1.5rem 0 0.5rem;
	}
	:global(.tiptap-editor h2) {
		margin: 1.25rem 0 0.375rem;
	}
	:global(.tiptap-editor h3) {
		margin: 1rem 0 0.25rem;
	}
	:global(.tiptap-editor ul),
	:global(.tiptap-editor ol) {
		margin: 0.5rem 0;
		padding-inline-start: 1.375rem;
	}
	:global(.tiptap-editor li ul),
	:global(.tiptap-editor li ol) {
		margin: 0.125rem 0;
	}
	:global(.tiptap-editor li) {
		margin: 0.125rem 0;
	}
	:global(.tiptap-editor li > p) {
		margin: 0;
	}
	:global(.tiptap-editor blockquote) {
		margin: 0.75rem 0;
		font-style: normal;
	}
	:global(.tiptap-editor blockquote p::before),
	:global(.tiptap-editor blockquote p::after) {
		content: none;
	}
	:global(.tiptap-editor pre) {
		margin: 0.75rem 0;
		padding: 0.75rem 1rem;
	}
	:global(.tiptap-editor code::before),
	:global(.tiptap-editor code::after) {
		content: none;
	}
	:global(.tiptap-editor :not(pre) > code) {
		background: color-mix(in oklch, var(--color-base-content) 8%, transparent);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-selector, 0.25rem);
		font-size: 0.875em;
		font-weight: inherit;
	}
	:global(.tiptap-editor [data-resize-wrapper]) {
		margin: 0.75rem 0;
	}
	:global(.tiptap-editor [data-resize-wrapper] img),
	:global(.tiptap-editor img) {
		margin: 0;
	}
	:global(.tiptap-editor hr) {
		margin: 1.25rem 0;
	}
	:global(.tiptap-editor > :first-child) {
		margin-top: 0;
	}
	:global(.tiptap-editor > :last-child) {
		margin-bottom: 0;
	}

	/* Keyed on data-editable so a runtime editable flip re-applies. */
	:global(.tiptap-shell[data-editable='true'] .tiptap-editor) {
		min-height: 20rem;
		padding: 1rem 1.5rem;
	}
	:global(.tiptap-shell[data-editable='false'] .tiptap-editor) {
		min-height: 0;
		padding: 0;
	}
	:global(.tiptap-shell[data-editable='false'] .tiptap-editor [data-resize-handle]) {
		display: none;
		pointer-events: none;
	}
	@media (max-width: 640px) {
		:global(.tiptap-shell[data-editable='true'] .tiptap-editor) {
			padding: 0.75rem 1rem;
		}
	}

	:global(.tiptap-drag-handle) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--radius-field, 0.25rem);
		font-family: 'Material Symbols Rounded';
		font-size: 18px;
		font-variation-settings:
			'FILL' 0,
			'wght' 400,
			'GRAD' 0,
			'opsz' 24;
		line-height: 1;
		color: var(--color-base-content);
		background: transparent;
		opacity: 0.4;
		cursor: grab;
		user-select: none;
		transition:
			opacity 100ms ease-out,
			background-color 100ms ease-out;
	}
	:global(.tiptap-drag-handle:hover) {
		opacity: 0.7;
		background: color-mix(in oklch, var(--color-base-content) 10%, transparent);
	}
	:global(.tiptap-drag-handle[data-dragging='true']) {
		cursor: grabbing;
	}
	/* No drag affordance in read-only or on touch (F1e / D9). */
	:global(.tiptap-shell[data-editable='false'] .tiptap-drag-handle) {
		display: none;
	}
	@media (hover: none) {
		:global(.tiptap-drag-handle) {
			display: none;
		}
	}

	:global(.tiptap-editor .ProseMirror-selectednode) {
		outline: 2px solid color-mix(in oklch, var(--color-primary) 45%, transparent);
		outline-offset: 2px;
	}
	:global(.tiptap-editor .ProseMirror-gapcursor::after) {
		border-top-color: color-mix(in oklch, var(--color-primary) 55%, transparent);
		border-top-width: 2px;
	}

	/* Keeps the selection visible while the editor is blurred (link editing). */
	:global(.tiptap-editor .selection) {
		background: color-mix(in oklch, var(--color-primary) 18%, transparent);
	}
</style>
