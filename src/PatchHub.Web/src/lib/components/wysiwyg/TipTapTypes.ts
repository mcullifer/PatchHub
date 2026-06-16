import type { Content, Editor, JSONContent } from '@tiptap/core';

export type TipTapContent = Content;
export type TipTapJsonContent = JSONContent;
export type TipTapSavePayload = {
	json: TipTapJsonContent;
	html: string;
	text: string;
	isEmpty: boolean;
};
export type TipTapToolbarProps = {
	editor: Editor;
	revision: number;
	onsave?: (content: TipTapSavePayload) => void | Promise<void>;
};
export type BlockFormat = 'paragraph' | 'heading-1' | 'heading-2' | 'heading-3' | 'codeBlock';
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type ActiveControl =
	| 'bold'
	| 'italic'
	| 'underline'
	| 'strike'
	| 'code'
	| 'bulletList'
	| 'orderedList'
	| 'blockquote'
	| 'link'
	| 'alignLeft'
	| 'alignCenter'
	| 'alignRight'
	| 'alignJustify';
export type NormalizeUrlOptions = {
	allowHash?: boolean;
	allowRootRelative?: boolean;
	allowedProtocols: readonly string[];
};
export type ToolbarButton = {
	id: string;
	label: string;
	icon: string;
	run: () => void;
	activeKey?: ActiveControl;
};
