import { createAttachmentKey } from 'svelte/attachments';
import type {
	FloatingContext,
	FloatingEvent,
	FloatingInteractionProps,
	MaybeGetter
} from './types';
import { resolve } from './types';

type UseHoverConfig = {
	enabled?: MaybeGetter<boolean>;
	openDelay?: MaybeGetter<number>;
};

export function useHover(
	context: FloatingContext,
	config: UseHoverConfig = {}
): FloatingInteractionProps {
	const referenceAttachmentKey = createAttachmentKey();
	let referenceHovered = false;
	let floatingHovered = false;
	let openTimeout: ReturnType<typeof setTimeout> | undefined;

	function enabled() {
		return resolve(config.enabled) !== false;
	}

	function clearOpenTimeout() {
		if (!openTimeout) return;

		clearTimeout(openTimeout);
		openTimeout = undefined;
	}

	function contains(target: EventTarget | null) {
		if (!(target instanceof Node)) return false;

		return Boolean(
			(context.elements.reference instanceof Node && context.elements.reference.contains(target)) ||
			context.elements.floating?.contains(target)
		);
	}

	function maybeClose(event: FloatingEvent) {
		if (!enabled()) return;
		if (event instanceof MouseEvent && contains(event.relatedTarget)) return;

		if (!referenceHovered && !floatingHovered) {
			clearOpenTimeout();
			context.onOpenChange?.(false, event, 'hover');
		}
	}

	return {
		reference: {
			[referenceAttachmentKey]: () => clearOpenTimeout,
			onmouseenter: (event: FloatingEvent) => {
				if (!enabled()) return;

				referenceHovered = true;
				clearOpenTimeout();

				const openDelay = resolve(config.openDelay) ?? 0;

				if (openDelay <= 0) {
					context.onOpenChange?.(true, event, 'hover');
					return;
				}

				openTimeout = setTimeout(() => {
					openTimeout = undefined;

					if (enabled() && referenceHovered) {
						context.onOpenChange?.(true, event, 'hover');
					}
				}, openDelay);
			},
			onmouseleave: (event: FloatingEvent) => {
				referenceHovered = false;
				clearOpenTimeout();
				maybeClose(event);
			}
		},
		floating: {
			onmouseenter: () => {
				if (!enabled()) return;
				floatingHovered = true;
			},
			onmouseleave: (event: FloatingEvent) => {
				floatingHovered = false;
				maybeClose(event);
			}
		}
	};
}
