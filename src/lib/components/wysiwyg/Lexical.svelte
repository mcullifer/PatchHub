<script lang="ts">
	import { theme } from '$lib/components/wysiwyg/LexicalTheme';
	import { $generateNodesFromDOM as generateNodesFromDOM } from '@lexical/html';
	import { registerRichText } from '@lexical/rich-text';
	import { createEditor, $insertNodes as insertNodes, type CreateEditorArgs } from 'lexical';

	let { content }: { content: string } = $props();

	const config: CreateEditorArgs = {
		namespace: 'MyEditor',
		theme: theme,
		onError: console.error
	};

	function useLexical(node: HTMLDivElement) {
		$effect(() => {
			const editor = createEditor(config);
			editor.setRootElement(node);
			registerRichText(editor);

			editor.update(() => {
				const parser = new DOMParser();
				const dom = parser.parseFromString(content, 'text/html');
				const nodes = generateNodesFromDOM(editor, dom);
				insertNodes(nodes);
			});
			return () => {};
		});
	}
</script>

<div contenteditable="true" use:useLexical></div>
