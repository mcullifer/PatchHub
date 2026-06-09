import type { FloatingContext, FloatingInteractionProps, MaybeGetter } from './types';
import { resolve } from './types';

type UseRoleConfig = {
	role: MaybeGetter<string | undefined>;
};

export function useRole(context: FloatingContext, config: UseRoleConfig): FloatingInteractionProps {
	return {
		reference: () => {
			const role = resolve(config.role);
			const props: Record<string, unknown> = {};

			if (role && role !== 'tooltip') {
				props['aria-expanded'] = context.isOpen();
			}

			return props;
		},
		floating: () => {
			const role = resolve(config.role);
			return role ? { role } : {};
		}
	};
}
