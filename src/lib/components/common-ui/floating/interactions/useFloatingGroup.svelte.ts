// A warm group has shown a member recently, so tooltips moving between
// neighboring triggers skip the open delay and entrance animation.
const WARM_COOLDOWN_MS = 350;

class FloatingGroupState {
	activeId = $state<string>();
	warm = $state(false);
	private cooldown: ReturnType<typeof setTimeout> | undefined;

	activate(id: string) {
		clearTimeout(this.cooldown);
		this.activeId = id;
		this.warm = true;
	}

	clear(id?: string) {
		if (id !== undefined && this.activeId !== id) return;
		this.activeId = undefined;
		clearTimeout(this.cooldown);
		this.cooldown = setTimeout(() => (this.warm = false), WARM_COOLDOWN_MS);
	}
}

const groups: Record<string, FloatingGroupState | undefined> = {};

export function useFloatingGroup(name: string) {
	const group = (groups[name] ??= new FloatingGroupState());

	return {
		get activeId() {
			return group.activeId;
		},
		get warm() {
			return group.warm;
		},
		activate: (id: string) => group.activate(id),
		clear: (id?: string) => group.clear(id)
	};
}
