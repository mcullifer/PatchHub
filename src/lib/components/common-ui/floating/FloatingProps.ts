import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
import type {
	FloatingInstance,
	FloatingOptions,
	OpenChangeReason,
	UseClickOptions
} from './floating.svelte';
export type { FloatingOptions } from './floating.svelte';

/** Initial hover delay for tooltip surfaces; skipped while the tooltip group is warm. */
export const TOOLTIP_DELAY_MS = 300;

export type FloatingPropsBase = {
	reference: Snippet<[FloatingInstance]>;
	children: Snippet;
	opts?: FloatingOptions;
	floatingClass?: ClassValue;
	portal?: boolean;
};

export type TooltipProps = {
	arrowClass?: ClassValue;
	arrowBorderClass?: ClassValue;
	arrowPadding?: number;
	delay?: number;
} & FloatingPropsBase;

export type PopoverProps = {
	open?: boolean;
	closeOn?: OpenChangeReason[];
	openOn?: OpenChangeReason[];
	clickOpts?: UseClickOptions;
	arrowClass?: ClassValue;
	arrowBorderClass?: ClassValue;
} & FloatingPropsBase;

export type DropdownProps = {
	activator: Snippet<[FloatingInstance]>;
	children: Snippet;
	tip?: Snippet;
	opts?: FloatingOptions;
	clickOpts?: UseClickOptions;
	open?: boolean;
	portal?: boolean;
};
