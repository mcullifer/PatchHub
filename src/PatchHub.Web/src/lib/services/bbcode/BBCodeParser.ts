import { BBCodeTokenizer } from './BBCodeTokenizer';
import { isKnownSteamTag, steamSelfClosingTags } from './SteamBBCode';
import type { BBCodeToken, DocumentNode, ElementNode, ParseError, ParseOptions } from './types';

type ParseFrame = {
	node: DocumentNode | ElementNode;
	position: number;
};

export class SteamBBCodeAstParser {
	private readonly errors: ParseError[] = [];
	private readonly warnings: string[] = [];
	private readonly options: ParseOptions;

	constructor(options: ParseOptions = {}) {
		this.options = options;
	}

	parse(tokens: BBCodeToken[]): { ast: DocumentNode; errors: ParseError[]; warnings: string[] } {
		const root: DocumentNode = { type: 'document', children: [] };
		const stack: ParseFrame[] = [{ node: root, position: 0 }];

		for (const token of tokens) {
			if (token.type === 'text') {
				current(stack).children.push({ type: 'text', value: token.content });
				continue;
			}

			const tag = token.tag;
			if (!isKnownSteamTag(tag.name)) {
				this.addIssue('unknown_tag', `Unknown BBCode tag: ${tag.name}`, token.position);
				current(stack).children.push({ type: 'text', value: tag.raw });
				continue;
			}

			if (tag.isClosing) {
				this.closeTag(stack, token);
				continue;
			}

			if (tag.isSelfClosing || steamSelfClosingTags.has(tag.name)) {
				current(stack).children.push({ type: 'element', tag, children: [] });
				continue;
			}

			if (tag.name === '*') {
				this.openListItem(stack, token);
				continue;
			}

			const element: ElementNode = { type: 'element', tag, children: [] };
			current(stack).children.push(element);
			stack.push({ node: element, position: token.position });
		}

		while (stack.length > 1) {
			const frame = stack.pop();
			this.addIssue('unclosed_tag', 'Unclosed BBCode tag', frame?.position ?? 0);
		}

		return {
			ast: root,
			errors: this.errors,
			warnings: this.warnings
		};
	}

	private closeTag(stack: ParseFrame[], token: Extract<BBCodeToken, { type: 'tag' }>) {
		if (steamSelfClosingTags.has(token.tag.name)) {
			return;
		}

		const index = findOpenTag(stack, token.tag.name);
		if (index === -1) {
			this.addIssue(
				'invalid_tag',
				`Unmatched closing BBCode tag: ${token.tag.name}`,
				token.position
			);
			current(stack).children.push({ type: 'text', value: token.tag.raw });
			return;
		}

		while (stack.length - 1 >= index) {
			const frame = stack.pop();
			if (frame?.node.type === 'element' && frame.node.tag.name !== token.tag.name) {
				this.addIssue(
					'invalid_tag',
					`Mismatched BBCode tag: expected ${frame.node.tag.name}`,
					token.position
				);
			}
		}
	}

	private openListItem(stack: ParseFrame[], token: Extract<BBCodeToken, { type: 'tag' }>) {
		const currentFrame = current(stack);
		if (currentFrame.type === 'element' && currentFrame.tag.name === '*') {
			stack.pop();
		}

		const item: ElementNode = { type: 'element', tag: token.tag, children: [] };
		current(stack).children.push(item);
		stack.push({ node: item, position: token.position });
	}

	private addIssue(type: ParseError['type'], message: string, position: number) {
		const issue = { type, message, position };
		if (this.options.strictMode) {
			this.errors.push(issue);
		} else {
			this.warnings.push(message);
		}
	}
}

export function parseBBCodeAst(input: string, options: ParseOptions = {}) {
	const tokenizer = new BBCodeTokenizer(input);
	const parser = new SteamBBCodeAstParser(options);
	return parser.parse(tokenizer.tokenize());
}

function current(stack: ParseFrame[]): DocumentNode | ElementNode {
	return stack[stack.length - 1].node;
}

function findOpenTag(stack: ParseFrame[], tagName: string): number {
	for (let index = stack.length - 1; index > 0; index -= 1) {
		const node = stack[index].node;
		if (node.type === 'element' && node.tag.name === tagName) return index;
	}
	return -1;
}
