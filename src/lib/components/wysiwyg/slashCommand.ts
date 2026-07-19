// Type-only side effect: StarterKit's extensions augment ChainedCommands, which
// plain tsc never sees through .svelte imports alone.
import '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import type { SlashCommandItem, SlashCommandSuggestionProps } from './TipTapTypes';

type SlashCommandOptions = {
	items: () => SlashCommandItem[];
	onStart: (props: SlashCommandSuggestionProps) => void;
	onUpdate: (props: SlashCommandSuggestionProps) => void;
	onKeyDown: (event: KeyboardEvent) => boolean;
	onExit: () => void;
};

const slashCommandPluginKey = new PluginKey('slashCommand');

export function filterSlashCommandItems(
	items: readonly SlashCommandItem[],
	query: string
): SlashCommandItem[] {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return [...items];

	return items.filter((item) =>
		[item.label, ...item.keywords].some((value) => value.toLowerCase().includes(normalizedQuery))
	);
}

export function createSlashCommandItems(openImageDialog: () => void): SlashCommandItem[] {
	return [
		{
			id: 'text',
			label: 'Text',
			icon: 'notes',
			keywords: ['paragraph', 'plain'],
			run: (editor) => {
				editor.chain().focus().setParagraph().run();
			}
		},
		{
			id: 'heading-1',
			label: 'Heading 1',
			icon: 'format_h1',
			keywords: ['h1', 'title'],
			run: (editor) => {
				editor.chain().focus().setHeading({ level: 1 }).run();
			}
		},
		{
			id: 'heading-2',
			label: 'Heading 2',
			icon: 'format_h2',
			keywords: ['h2', 'section'],
			run: (editor) => {
				editor.chain().focus().setHeading({ level: 2 }).run();
			}
		},
		{
			id: 'heading-3',
			label: 'Heading 3',
			icon: 'format_h3',
			keywords: ['h3', 'subheading'],
			run: (editor) => {
				editor.chain().focus().setHeading({ level: 3 }).run();
			}
		},
		{
			id: 'bullet-list',
			label: 'Bullet list',
			icon: 'format_list_bulleted',
			keywords: ['ul', 'unordered'],
			run: (editor) => {
				editor.chain().focus().toggleBulletList().run();
			}
		},
		{
			id: 'numbered-list',
			label: 'Numbered list',
			icon: 'format_list_numbered',
			keywords: ['ol', 'ordered'],
			run: (editor) => {
				editor.chain().focus().toggleOrderedList().run();
			}
		},
		{
			id: 'quote',
			label: 'Quote',
			icon: 'format_quote',
			keywords: ['blockquote', 'citation'],
			run: (editor) => {
				editor.chain().focus().toggleBlockquote().run();
			}
		},
		{
			id: 'code-block',
			label: 'Code block',
			icon: 'code_blocks',
			keywords: ['pre', 'code'],
			run: (editor) => {
				editor.chain().focus().toggleCodeBlock().run();
			}
		},
		{
			id: 'divider',
			label: 'Divider',
			icon: 'horizontal_rule',
			keywords: ['rule', 'hr', 'line'],
			run: (editor) => {
				editor.chain().focus().setHorizontalRule().run();
			}
		},
		{
			id: 'image',
			label: 'Image',
			icon: 'image',
			keywords: ['photo', 'media', 'picture'],
			run: () => {
				openImageDialog();
			}
		}
	];
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
	name: 'slashCommand',

	addOptions() {
		return {
			items: () => [],
			onStart: () => undefined,
			onUpdate: () => undefined,
			onKeyDown: () => false,
			onExit: () => undefined
		};
	},

	addProseMirrorPlugins() {
		return [
			Suggestion<SlashCommandItem, SlashCommandItem>({
				pluginKey: slashCommandPluginKey,
				editor: this.editor,
				char: '/',
				allowSpaces: false,
				allowedPrefixes: null,
				startOfLine: false,
				initialItems: this.options.items(),
				items: ({ query }) => filterSlashCommandItems(this.options.items(), query),
				command: ({ editor, range, props }) => {
					editor.chain().focus().deleteRange(range).run();
					props.run(editor, range);
				},
				allow: ({ editor }) => editor.isEditable && !editor.isActive('codeBlock'),
				shouldShow: ({ editor, query }) =>
					editor.isEditable &&
					!editor.isActive('codeBlock') &&
					filterSlashCommandItems(this.options.items(), query).length > 0,
				render: () => ({
					onStart: (props) => {
						if (!props.editor.isEditable) return;
						this.options.onStart(props);
					},
					onUpdate: (props) => {
						if (!props.editor.isEditable) return;
						this.options.onUpdate(props);
					},
					onKeyDown: ({ event }) => this.options.onKeyDown(event),
					onExit: () => {
						this.options.onExit();
					}
				})
			})
		];
	}
});
