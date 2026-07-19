import { MediaQuery } from 'svelte/reactivity';

// Keyboard hints only make sense on devices that likely have a keyboard;
// false during SSR so touch devices never flash them.
export const hasKeyboard = new MediaQuery('(hover: hover) and (pointer: fine)');

const isMacLike =
	typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform);

export const modifierKey = isMacLike ? '⌘' : 'Ctrl';
