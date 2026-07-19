export type PreserveNewlines = 'all' | 'double' | 'none';

export type ParseErrorType = 'unclosed_tag' | 'invalid_tag' | 'malformed_attribute' | 'unknown_tag';

export interface BBCodeTag {
	name: string;
	attributes: Record<string, string>;
	value?: string;
	isClosing: boolean;
	isSelfClosing: boolean;
	raw: string;
}

export type BBCodeToken =
	| {
			type: 'text';
			content: string;
			position: number;
	  }
	| {
			type: 'tag';
			content: string;
			tag: BBCodeTag;
			position: number;
	  };

export interface ParseOptions {
	allowUnclosedTags?: boolean;
	strictMode?: boolean;
	customTags?: Record<string, (content: string, attributes: Record<string, string>) => string>;
	escapeHtml?: boolean;
	steamClanImageUrl?: string;
	preserveNewlines?: PreserveNewlines;
}

export interface ParseError {
	message: string;
	position: number;
	type: ParseErrorType;
}

export interface ParseResult {
	html: string;
	errors: ParseError[];
	warnings: string[];
}

export type BBCodeNode = DocumentNode | TextNode | ElementNode;

export interface DocumentNode {
	type: 'document';
	children: BBCodeNode[];
}

export interface TextNode {
	type: 'text';
	value: string;
}

export interface ElementNode {
	type: 'element';
	tag: BBCodeTag;
	children: BBCodeNode[];
}
