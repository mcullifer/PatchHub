import { createAttachmentKey } from 'svelte/attachments';
import { on } from 'svelte/events';
import type {
	FloatingContext,
	FloatingInteractionProps,
	FloatingPointerEvent,
	MaybeGetter
} from './types';
import { resolve } from './types';

type UseDismissConfig = {
	enabled?: MaybeGetter<boolean>;
	outsidePress?: MaybeGetter<boolean>;
	escapeKey?: MaybeGetter<boolean>;
};

function elementContains(element: Element | null, target: EventTarget | null) {
	return target instanceof Node && element?.contains(target);
}

type RectLike = Pick<DOMRect, 'bottom' | 'left' | 'right' | 'top'>;

function isPointInside(
	element: { getBoundingClientRect: () => RectLike } | null,
	event: MouseEvent
) {
	if (!element) return false;

	const rect = element.getBoundingClientRect();
	return (
		event.clientX >= rect.left &&
		event.clientX <= rect.right &&
		event.clientY >= rect.top &&
		event.clientY <= rect.bottom
	);
}

function isScrollableElement(element: HTMLElement) {
	const style = getComputedStyle(element);
	const canScrollY =
		element.scrollHeight > element.clientHeight &&
		style.overflowY !== 'hidden' &&
		style.overflowY !== 'visible';
	const canScrollX =
		element.scrollWidth > element.clientWidth &&
		style.overflowX !== 'hidden' &&
		style.overflowX !== 'visible';

	return canScrollY || canScrollX;
}

export function isPointerOnElementScrollbar(element: HTMLElement, event: FloatingPointerEvent) {
	const style = getComputedStyle(element);
	const hasVerticalScrollbar =
		element.scrollHeight > element.clientHeight && style.overflowY !== 'hidden';
	const hasHorizontalScrollbar =
		element.scrollWidth > element.clientWidth && style.overflowX !== 'hidden';

	const rect = element.getBoundingClientRect();
	const isRtl = style.direction === 'rtl';
	const verticalScrollbarWidth = element.offsetWidth - element.clientWidth;
	const horizontalScrollbarHeight = element.offsetHeight - element.clientHeight;

	const onVerticalScrollbar =
		hasVerticalScrollbar &&
		verticalScrollbarWidth > 0 &&
		event.clientY >= rect.top &&
		event.clientY <= rect.bottom &&
		(isRtl
			? event.clientX >= rect.left && event.clientX <= rect.left + verticalScrollbarWidth
			: event.clientX <= rect.right && event.clientX >= rect.right - verticalScrollbarWidth);

	const onHorizontalScrollbar =
		hasHorizontalScrollbar &&
		horizontalScrollbarHeight > 0 &&
		event.clientX >= rect.left &&
		event.clientX <= rect.right &&
		event.clientY <= rect.bottom &&
		event.clientY >= rect.bottom - horizontalScrollbarHeight;

	return onVerticalScrollbar || onHorizontalScrollbar;
}

function isPointerOnScrollableDescendantScrollbar(root: HTMLElement, event: FloatingPointerEvent) {
	if (isPointerOnElementScrollbar(root, event)) return true;

	for (const element of root.querySelectorAll<HTMLElement>('[data-floating-scroll-area], *')) {
		if (!isScrollableElement(element)) continue;
		if (!isPointInside(element, event)) continue;
		if (isPointerOnElementScrollbar(element, event)) return true;
	}

	return false;
}

export function useDismiss(
	context: FloatingContext,
	config: UseDismissConfig = {}
): FloatingInteractionProps {
	const attachmentKey = createAttachmentKey();
	let pointerDownInsideUntil = 0;

	function enabled() {
		return resolve(config.enabled) !== false;
	}

	function outsidePressEnabled() {
		return enabled() && resolve(config.outsidePress) !== false;
	}

	function escapeKeyEnabled() {
		return enabled() && resolve(config.escapeKey) !== false;
	}

	function wasRecentPointerDownInside() {
		return performance.now() <= pointerDownInsideUntil;
	}

	function isInsidePointer(event: FloatingPointerEvent) {
		const { reference, floating } = context.elements;

		return (
			elementContains(reference instanceof Element ? reference : null, event.target) ||
			elementContains(floating, event.target) ||
			isPointInside(reference, event) ||
			isPointInside(floating, event) ||
			(floating ? isPointerOnScrollableDescendantScrollbar(floating, event) : false)
		);
	}

	function trackInsidePointer(event: FloatingPointerEvent) {
		if (isInsidePointer(event)) {
			pointerDownInsideUntil = performance.now() + 250;
		}
	}

	return {
		floating: {
			[attachmentKey]: () => {
				if (typeof document === 'undefined') return;

				const removePointerDown = on(
					document,
					'pointerdown',
					(event) => {
						trackInsidePointer(event);

						if (!outsidePressEnabled() || wasRecentPointerDownInside()) return;
						context.onOpenChange?.(false, event, 'outside-press');
					},
					{ capture: true }
				);
				const removeMouseDown = on(
					document,
					'mousedown',
					(event) => {
						trackInsidePointer(event);
					},
					{ capture: true }
				);
				const removeKeyDown = on(
					document,
					'keydown',
					(event) => {
						if (event.key === 'Escape' && escapeKeyEnabled()) {
							context.onOpenChange?.(false, event, 'escape-key');
						}
					},
					{ capture: true }
				);

				return () => {
					removePointerDown();
					removeMouseDown();
					removeKeyDown();
				};
			}
		}
	};
}
