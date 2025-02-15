import type { OpenChangeReason, UseFloatingOptions } from '@skeletonlabs/floating-ui-svelte';
import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export type FloatingOptions = Omit<
	UseFloatingOptions,
	'whileElementsMounted' | 'onOpenChange' | 'elements' | 'transform'
>;

export type FloatingPropsBase = {
	reference: Snippet;
	children: Snippet;
	opts?: FloatingOptions;
	referenceClass?: ClassValue;
	floatingClass?: ClassValue;
};

export type TooltipProps = { arrowClass?: ClassValue; delay?: number } & FloatingPropsBase;

export type PopoverProps = {
	open?: boolean;
	closeOn?: OpenChangeReason[];
	openOn?: OpenChangeReason[];
	onclick?: () => void;
} & Omit<FloatingPropsBase, 'arrowClass'>;

export type DropdownProps = {
	activator: Snippet;
	children: Snippet;
	tip?: Snippet;
	opts?: FloatingOptions;
	open?: boolean;
	activatorClass?: ClassValue;
};
