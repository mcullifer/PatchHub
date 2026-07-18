type HotkeyPredicate = (event: KeyboardEvent) => boolean;

export class Hotkeys {
	static Search: HotkeyPredicate = (e) => (e.ctrlKey || e.metaKey) && e.key === 'k';
}

/**
 * Attach a hotkey and action
 * @note By default the hotkey is attached to window, pass `nodeOnly: true` to make it local to the node
 */
export function hotkey(
	node: HTMLElement,
	opts: { hotkey: HotkeyPredicate; action: (node: HTMLElement) => void; nodeOnly?: boolean }
) {
	const handler = (event: KeyboardEvent) => {
		if (opts.hotkey(event)) {
			event.preventDefault();
			opts.action(node);
		}
	};
	if (opts.nodeOnly) {
		node.addEventListener('keydown', handler);
		return {
			destroy() {
				node.removeEventListener('keydown', handler);
			}
		};
	}
	window.addEventListener('keydown', handler);
	return {
		destroy() {
			window.removeEventListener('keydown', handler);
		}
	};
}
