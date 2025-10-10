<script lang="ts">
	import { Menu, MenuItem } from '$lib/components/common-ui';
	import { Editor } from '@tiptap/core';
	import Image from '@tiptap/extension-image';
	import Link from '@tiptap/extension-link';
	import StarterKit from '@tiptap/starter-kit';
	import AutoJoiner from 'tiptap-extension-auto-joiner';
	import GlobalDragHandle from 'tiptap-extension-global-drag-handle';

	let { content, editable = true }: { content?: string; editable?: boolean } = $props();
	let element = $state<HTMLDivElement>();
	let editor = $state<Editor>();

	$effect(() => {
		editor = new Editor({
			element: element,
			extensions: [
				AutoJoiner,
				Link.configure({
					autolink: true,
					HTMLAttributes: {
						class: 'link link-hover'
					}
				}),
				GlobalDragHandle.configure({
					dragHandleSelector: '.drag-handle',
					excludedTags: ['pre', 'code', 'table p']
				}),
				StarterKit.configure(),
				Image.configure({
					inline: true
				})
			],
			editable: editable,
			content: content,
			editorProps: {
				attributes: {
					class: 'tiptap-editor prose  max-w-none w-full outline-none'
				}
			},
			onTransaction: (transaction) => {
				editor = undefined;
				editor = transaction.editor;
			}
		});
		return () => {
			editor?.destroy();
		};
	});
</script>

{#if editor}
	<Menu class="menu-horizontal menu-sm bg-base-300 rounded-box not-prose my-2">
		<MenuItem
			onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
			class={[{ 'menu-active': editor.isActive('heading', { level: 1 }) }]}
		>
			H1
		</MenuItem>
		<MenuItem
			onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
			class={[{ 'menu-active': editor.isActive('heading', { level: 2 }) }]}
		>
			H2
		</MenuItem>
		<MenuItem
			onclick={() => editor?.chain().focus().setParagraph().run()}
			class={[{ 'menu-active': editor.isActive('paragraph') }]}
		>
			P
		</MenuItem>
	</Menu>
{/if}

<div bind:this={element}></div>
<div
	class="drag-handle fixed z-50 size-6 cursor-grab opacity-100 transition-opacity duration-200 ease-in active:cursor-grabbing [&.hide]:pointer-events-none [&.hide]:opacity-0"
></div>

<style lang="postcss">
	@reference '../../../app.css';

	/* Compact spacing for TipTap editor to reduce large gaps */
	:global(.tiptap-editor) {
		/* Reduce spacing between paragraphs and headings */
		:global(p) {
			margin-top: 0.5em;
			margin-bottom: 0.5em;
		}

		:global(h1, h2, h3, h4, h5, h6) {
			margin-top: 0.75em;
			margin-bottom: 0.5em;
		}

		/* Compact lists */
		:global(ul, ol) {
			margin-top: 0.5em;
			margin-bottom: 0.5em;
			padding-left: 1.5em;
		}

		:global(li) {
			margin-top: 0.25em;
			margin-bottom: 0.25em;
		}

		/* Compact blockquotes */
		:global(blockquote) {
			margin-top: 0.75em;
			margin-bottom: 0.75em;
			padding-left: 1em;
			border-left: 3px solid currentColor;
		}

		/* Images */
		:global(img) {
			margin-top: 0.5em;
			margin-bottom: 0.5em;
			max-width: 100%;
			height: auto;
		}

		/* First and last element spacing */
		:global(> *:first-child) {
			margin-top: 0;
		}

		:global(> *:last-child) {
			margin-bottom: 0;
		}

		/* Remove excessive line height */
		line-height: 1.6;
	}

	.drag-handle {
		@media screen and (max-width: 600px) {
			display: none;
			pointer-events: none;
		}
	}

	.drag-handle::after {
		@apply text-base-content;
		content: '⠿';
	}
</style>
