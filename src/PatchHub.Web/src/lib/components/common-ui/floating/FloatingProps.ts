import type {
	OpenChangeReason,
	UseFloatingOptions,
	UseFloatingReturn,
	UseInteractionsReturn
} from '@skeletonlabs/floating-ui-svelte';
import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export type FloatingOptions = Omit<
	UseFloatingOptions,
	'whileElementsMounted' | 'onOpenChange' | 'elements' | 'transform'
>;

export type FloatingPropsBase = {
	reference: Snippet<[UseFloatingReturn, UseInteractionsReturn]>;
	children: Snippet;
	opts?: FloatingOptions;
	floatingClass?: ClassValue;
};

export type TooltipProps = { arrowClass?: ClassValue; delay?: number } & FloatingPropsBase;

export type PopoverProps = {
	open?: boolean;
	closeOn?: OpenChangeReason[];
	openOn?: OpenChangeReason[];
} & Omit<FloatingPropsBase, 'arrowClass'>;

export type DropdownProps = {
	activator: Snippet<[UseFloatingReturn, UseInteractionsReturn]>;
	children: Snippet;
	tip?: Snippet;
	opts?: FloatingOptions;
	open?: boolean;
};
