import { mergeProps } from './mergeProps';
import type { FloatingInteractionProps, FloatingProps } from './types';

function resolveInteractionProps(
	props: FloatingInteractionProps['reference'],
	userProps: FloatingProps | undefined
) {
	return typeof props === 'function' ? props(userProps) : props;
}

export function useInteractions(interactions: Array<FloatingInteractionProps | false | undefined>) {
	const activeInteractions = interactions.filter(Boolean) as FloatingInteractionProps[];

	return {
		reference: (userProps?: FloatingProps) =>
			mergeProps(
				...activeInteractions.map((interaction) =>
					resolveInteractionProps(interaction.reference, userProps)
				)
			),
		floating: (userProps?: FloatingProps) =>
			mergeProps(
				...activeInteractions.map((interaction) =>
					resolveInteractionProps(interaction.floating, userProps)
				)
			)
	};
}
