import type {
	FloatingContext,
	FloatingEvent,
	FloatingInteractionProps,
	MaybeGetter,
	UseClickOptions
} from './types';
import { resolve } from './types';

type UseClickConfig = {
	enabled?: MaybeGetter<boolean>;
	options?: MaybeGetter<UseClickOptions | undefined>;
};

export function useClick(
	context: FloatingContext,
	config: UseClickConfig = {}
): FloatingInteractionProps {
	return {
		reference: {
			onclick: (event: FloatingEvent) => {
				if (resolve(config.enabled) === false) return;

				const options = resolve(config.options);
				if (options?.ignoreMouse && event instanceof MouseEvent) return;

				if (context.isOpen()) {
					if (options?.toggle !== false) {
						context.onOpenChange?.(false, event, 'click');
					}
					return;
				}

				context.onOpenChange?.(true, event, 'click');
			}
		}
	};
}
