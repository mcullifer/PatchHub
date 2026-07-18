class FloatingGroupState {
	activeId = $state<string>();
}

const groups: Record<string, FloatingGroupState | undefined> = {};

export function useFloatingGroup(name: string) {
	let group = groups[name];

	if (!group) {
		group = new FloatingGroupState();
		groups[name] = group;
	}

	return {
		get activeId() {
			return group.activeId;
		},
		activate(id: string) {
			group.activeId = id;
		},
		clear(id?: string) {
			if (id === undefined || group.activeId === id) {
				group.activeId = undefined;
			}
		}
	};
}
