import type { Attachment } from 'svelte/attachments';
import type { AttachmentProps, FloatingProps } from './types';

function isEventHandlerKey(key: PropertyKey) {
	return typeof key === 'string' && key.startsWith('on');
}

function composeHandlers(first: unknown, second: unknown) {
	return (event: Event) => {
		(first as (event: Event) => void)(event);
		(second as (event: Event) => void)(event);
	};
}

export function mergeProps<T extends FloatingProps>(
	...propSets: Array<FloatingProps | AttachmentProps | T | false | null | undefined>
) {
	const merged: FloatingProps & AttachmentProps = {};

	for (const props of propSets) {
		if (!props) continue;

		for (const key of Reflect.ownKeys(props)) {
			const value = props[key as keyof typeof props];
			const existing = merged[key];

			if (typeof key === 'symbol') {
				merged[key] = value as Attachment<HTMLElement>;
				continue;
			}

			if (isEventHandlerKey(key) && typeof existing === 'function' && typeof value === 'function') {
				merged[key] = composeHandlers(existing, value);
				continue;
			}

			merged[key] = value;
		}
	}

	return merged as T & AttachmentProps;
}
