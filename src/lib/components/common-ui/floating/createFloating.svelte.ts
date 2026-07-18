import {
	autoUpdate,
	computePosition,
	type ComputePositionConfig,
	type MiddlewareData,
	type Placement,
	type ReferenceElement,
	type Strategy
} from '@floating-ui/dom';
import { createAttachmentKey } from 'svelte/attachments';
import { mergeProps } from './interactions/mergeProps';
import type {
	AttachmentProps,
	FloatingContext,
	FloatingEvent,
	FloatingInstance,
	FloatingOptions,
	FloatingProps,
	OpenChangeReason
} from './interactions/types';

type CreateFloatingOptions = {
	open: () => boolean;
	opts?: () => FloatingOptions | undefined;
	defaultPlacement?: Placement;
	defaultStrategy?: Strategy;
	whileElementsMounted?: (
		reference: ReferenceElement,
		floating: HTMLElement,
		update: () => void
	) => () => void;
	onOpenChange?: (open: boolean, event: FloatingEvent, reason: OpenChangeReason) => void;
	onPositioned?: (result: {
		x: number;
		y: number;
		placement: Placement;
		strategy: Strategy;
		middlewareData: MiddlewareData;
	}) => void;
};

export function createFloating(options: CreateFloatingOptions): FloatingInstance {
	const referenceAttachmentKey = createAttachmentKey();
	const floatingAttachmentKey = createAttachmentKey();
	let cleanupPositioning: (() => void) | undefined;

	const elements: FloatingContext['elements'] = {
		reference: null,
		floating: null
	};

	const context = $state({
		placement: options.defaultPlacement ?? 'bottom',
		strategy: options.defaultStrategy ?? 'absolute',
		middlewareData: {} as MiddlewareData,
		x: 0,
		y: 0
	});

	function isOpen() {
		return options.open();
	}

	const floatingContext: FloatingContext = {
		elements,
		state: context,
		isOpen,
		onOpenChange: options.onOpenChange
	};

	function getOptions() {
		return options.opts?.() ?? {};
	}

	function stopPositioning() {
		cleanupPositioning?.();
		cleanupPositioning = undefined;
	}

	function syncPositioning() {
		stopPositioning();

		if (!elements.reference || !elements.floating) return;

		cleanupPositioning = (options.whileElementsMounted ?? autoUpdate)(
			elements.reference,
			elements.floating,
			() => {
				void updatePosition();
			}
		);
	}

	function applyInitialFloatingStyles(node: HTMLElement) {
		const opts = getOptions();
		Object.assign(node.style, {
			position: opts.strategy ?? options.defaultStrategy ?? 'absolute',
			left: '0',
			top: '0',
			visibility: 'hidden'
		});
	}

	function referenceIsConnected(reference: ReferenceElement) {
		return !(reference instanceof Element) || reference.isConnected;
	}

	async function updatePosition() {
		const reference = elements.reference;
		const floating = elements.floating;

		if (!reference || !floating) return;
		if (!referenceIsConnected(reference)) return;

		const opts = getOptions();
		const computeOptions: ComputePositionConfig = {
			placement: opts.placement ?? options.defaultPlacement ?? 'bottom',
			strategy: opts.strategy ?? options.defaultStrategy ?? 'absolute',
			middleware: opts.middleware
		};

		if (opts.platform) {
			computeOptions.platform = opts.platform;
		}

		const result = await computePosition(reference, floating, computeOptions);
		if (elements.reference !== reference || elements.floating !== floating) return;
		if (!referenceIsConnected(reference)) return;

		context.x = result.x;
		context.y = result.y;
		context.placement = result.placement;
		context.strategy = result.strategy;
		context.middlewareData = result.middlewareData;

		Object.assign(floating.style, {
			position: result.strategy,
			left: `${Math.round(result.x)}px`,
			top: `${Math.round(result.y)}px`,
			transform: '',
			visibility: ''
		});

		options.onPositioned?.(result);
	}

	function setReference(reference: ReferenceElement | null) {
		elements.reference = reference;
		syncPositioning();
	}

	function contains(target: EventTarget | null) {
		if (!(target instanceof Node)) return false;

		return Boolean(
			(elements.reference instanceof Node && elements.reference.contains(target)) ||
			elements.floating?.contains(target)
		);
	}

	function reference<T extends FloatingProps>(props?: T) {
		return mergeProps<T>(props, {
			[referenceAttachmentKey]: (node: HTMLElement) => {
				setReference(node);

				return () => {
					if (elements.reference === node) {
						elements.reference = null;
						stopPositioning();
					}
				};
			}
		} satisfies AttachmentProps);
	}

	function floating<T extends FloatingProps>(props?: T) {
		return mergeProps<T>(props, {
			[floatingAttachmentKey]: (node: HTMLElement) => {
				elements.floating = node;
				node.dataset.floating = '';
				applyInitialFloatingStyles(node);
				syncPositioning();

				return () => {
					if (elements.floating === node) {
						elements.floating = null;
						stopPositioning();
					}
				};
			}
		} satisfies AttachmentProps);
	}

	return {
		elements,
		context,
		floatingContext,
		reference,
		floating,
		setReference,
		updatePosition,
		isOpen,
		contains: (target) => contains(target)
	};
}
