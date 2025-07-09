<script lang="ts">
	import { Menu, MenuItem } from '$lib/components/common-ui';
	import { Editor } from '@tiptap/core';
	import Image from '@tiptap/extension-image';
	import StarterKit from '@tiptap/starter-kit';
	import AutoJoiner from 'tiptap-extension-auto-joiner';
	import GlobalDragHandle from 'tiptap-extension-global-drag-handle';

	let { content }: { content?: string } = $props();
	let element = $state<HTMLDivElement>();
	let editor = $state<Editor>();

	$effect(() => {
		editor = new Editor({
			element: element,
			extensions: [
				AutoJoiner,
				GlobalDragHandle.configure({
					dragHandleSelector: '.drag-handle',
					excludedTags: ['pre', 'code', 'table p']
				}),
				StarterKit,
				Image.configure({
					inline: true
				})
			],
			content: content,
			editorProps: {
				attributes: {
					class: 'prose w-full outline-none'
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
