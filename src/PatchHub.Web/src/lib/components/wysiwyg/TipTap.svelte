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
	import { Editor, type Extensions } from '@tiptap/core';
	import DragHandle from '@tiptap/extension-drag-handle';
	import Image from '@tiptap/extension-image';
	import Link from '@tiptap/extension-link';
	import Placeholder from '@tiptap/extension-placeholder';
	import TextAlign from '@tiptap/extension-text-align';
	import StarterKit from '@tiptap/starter-kit';
	import { onMount } from 'svelte';
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
	let editorElement: HTMLDivElement;

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
						'tiptap-editor patchhub-rich-text prose prose-sm sm:prose-base prose-a:link prose-a:link-primary prose-img:block prose-img:h-auto prose-img:max-w-full prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content max-w-none min-h-80 w-full px-6 py-5 outline-none max-sm:p-4'
				}
			},
			onContentError: ({ error }) => {
				contentErrorMessage = error.message;
			},
			onTransaction: () => {
				toolbarRevision += 1;
			}
		});

		appliedContent = content;
		return instance;
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
				openOnClick: false,
				HTMLAttributes: {
					class: 'link link-primary link-hover',
					rel: 'noopener noreferrer nofollow',
					target: '_blank'
				}
			}),
			TextAlign.configure({
				types: ['heading', 'paragraph']
			}),
			Placeholder.configure({
				placeholder: currentPlaceholder,
				showOnlyCurrent: false
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
					placement: 'left-start'
				},
				nested: {
					edgeDetection: {
						threshold: 18
					}
				}
			})
		];
	}

	function createDragHandle(): HTMLElement {
		const handle = document.createElement('div');
		handle.className = 'btn btn-square btn-soft btn-xs';
		handle.setAttribute('aria-hidden', 'true');
		handle.textContent = 'drag_indicator';
		handle.style.fontFamily = 'Material Symbols Rounded';
		handle.style.fontVariationSettings = "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
		handle.style.visibility = 'hidden';
		handle.style.pointerEvents = 'none';
		return handle;
	}

	onMount(() => {
		const instance = createEditor(editorElement);

		editor = instance;
		toolbarRevision += 1;

		return () => {
			instance.destroy();
			editor = null;
		};
	});

	$effect(() => {
		if (!editor) return;
		if (editor.isEditable === editable) return;

		editor.setEditable(editable, false);
	});

	$effect(() => {
		if (!editor || content === appliedContent) return;

		appliedContent = content;
		editor.commands.setContent(content ?? emptyEditorContent, {
			emitUpdate: false
		});
		contentErrorMessage = null;
		toolbarRevision += 1;
	});
</script>

<div class="rounded-lg bg-base-100">
	{#if editor && editable}
		<TipTapToolbar {editor} revision={toolbarRevision} {onsave} />
	{/if}

	{#if contentErrorMessage}
		<div class="not-prose border-base-content/20 border-b p-3">
			<div class="alert alert-warning text-sm">
				<Icon icon="warning" />
				<p>Some editor content could not be loaded because it is not valid for this editor.</p>
			</div>
		</div>
	{/if}

	<div bind:this={editorElement}></div>
</div>

<style lang="postcss">
	@reference '../../../app.css';

	:global(.tiptap-editor p.is-editor-empty:first-child::before) {
		color: color-mix(in oklch, currentColor 45%, transparent);
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	:global(.tiptap-editor .ProseMirror-selectednode) {
		outline: 2px solid color-mix(in oklch, var(--color-primary) 65%, transparent);
		outline-offset: 3px;
	}
</style>
