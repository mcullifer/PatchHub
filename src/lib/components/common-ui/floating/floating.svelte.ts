import { createFloating } from './createFloating.svelte';
import { mergeProps } from './interactions/mergeProps';
import { useClick } from './interactions/useClick.svelte';
import { useDismiss } from './interactions/useDismiss.svelte';
import { isPointerOnElementScrollbar } from './interactions/useDismiss.svelte';
import { useFloatingGroup } from './interactions/useFloatingGroup.svelte';
import { useHover } from './interactions/useHover.svelte';
import { useInteractions } from './interactions/useInteractions.svelte';
import { useRole } from './interactions/useRole.svelte';
import type {
	FloatingInstance,
	FloatingInteractionProps,
	FloatingProps
} from './interactions/types';
export type { FloatingOptions, OpenChangeReason, UseClickOptions } from './interactions/types';

export function withInteractions(
	floating: FloatingInstance,
	interactions: {
		reference: (props?: FloatingProps) => FloatingProps;
		floating: (props?: FloatingProps) => FloatingProps;
	}
): FloatingInstance {
	return {
		...floating,
		reference: <T extends FloatingProps>(props?: T) =>
			mergeProps<T>(props, floating.reference(), interactions.reference(props)),
		floating: <T extends FloatingProps>(props?: T) =>
			mergeProps<T>(props, floating.floating(), interactions.floating(props))
	};
}

export {
	createFloating,
	mergeProps,
	useClick,
	useDismiss,
	isPointerOnElementScrollbar,
	useFloatingGroup,
	useHover,
	useInteractions,
	useRole
};

export type { FloatingInstance, FloatingInteractionProps };
export type FloatingContext = FloatingInstance['context'];
