import type { Content, Editor, JSONContent, Range } from '@tiptap/core';
import type { SuggestionProps } from '@tiptap/suggestion';

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
	getPayload: () => TipTapSavePayload | null;
	openImageDialog: () => void;
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
export type SlashCommandItem = {
	id: string;
	label: string;
	icon: string;
	keywords: string[];
	run: (editor: Editor, range: Range) => void;
};
export type SlashCommandSuggestionProps = SuggestionProps<SlashCommandItem, SlashCommandItem>;

export const linkProtocols = ['http:', 'https:', 'mailto:'] as const;
export const imageProtocols = ['http:', 'https:'] as const;

export function normalizeUrl(value: string, options: NormalizeUrlOptions): string {
	const trimmedValue = value.trim();
	if (!trimmedValue) return '';

	if (options.allowHash && trimmedValue.startsWith('#')) return trimmedValue;
	if (options.allowRootRelative && trimmedValue.startsWith('/') && !trimmedValue.startsWith('//')) {
		return trimmedValue;
	}

	const hasProtocol = /^[a-z][a-z\d+\-.]*:/i.test(trimmedValue);
	let candidate = trimmedValue;

	if (!hasProtocol) {
		candidate = trimmedValue.startsWith('//') ? `https:${trimmedValue}` : `https://${trimmedValue}`;
	}

	if (!hasAllowedProtocol(candidate, options.allowedProtocols)) return '';

	return candidate;
}

export function hasAllowedProtocol(value: string, allowedProtocols: readonly string[]): boolean {
	try {
		const url = new URL(value);
		return allowedProtocols.includes(url.protocol);
	} catch {
		return false;
	}
}
