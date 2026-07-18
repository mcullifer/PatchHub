import { quintOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

/** Gentle scale (start -> 1) with a simultaneous opacity fade, for floating surfaces. */
export function pop(
	node: HTMLElement,
	{ duration = 150, easing = quintOut, start = 0.95 } = {}
): TransitionConfig {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
		return { duration: 0 };
	}

	return {
		duration,
		easing,
		css: (t: number) => `opacity: ${t}; scale: ${start + (1 - start) * t};`
	};
}
