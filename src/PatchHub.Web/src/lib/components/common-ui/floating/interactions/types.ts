import type {
	ComputePositionConfig,
	MiddlewareData,
	Placement,
	ReferenceElement,
	Strategy
} from '@floating-ui/dom';
import type { Attachment } from 'svelte/attachments';

export type FloatingEvent = Event | MouseEvent | KeyboardEvent | PointerEvent;
export type FloatingPointerEvent = MouseEvent | PointerEvent;
export type MaybeGetter<T> = T | (() => T);
export type FloatingProps = Record<PropertyKey, unknown>;
export type AttachmentProps = {
	[key: symbol]: Attachment<HTMLElement> | false | null | undefined;
};

export type OpenChangeReason = 'click' | 'hover' | 'outside-press' | 'escape-key';

export type UseClickOptions = {
	event?: 'click';
	toggle?: boolean;
	ignoreMouse?: boolean;
};

export type FloatingOptions = Partial<ComputePositionConfig>;

export type FloatingContext = {
	elements: {
		reference: ReferenceElement | null;
		floating: HTMLElement | null;
	};
	state: {
		placement: Placement;
		strategy: Strategy;
		middlewareData: MiddlewareData;
		x: number;
		y: number;
	};
	isOpen: () => boolean;
	onOpenChange?: (open: boolean, event: FloatingEvent, reason: OpenChangeReason) => void;
};

export type FloatingInteractionProps = {
	reference?: FloatingProps | ((userProps?: FloatingProps) => FloatingProps);
	floating?: FloatingProps | ((userProps?: FloatingProps) => FloatingProps);
};

export type FloatingInstance = {
	elements: FloatingContext['elements'];
	context: FloatingContext['state'];
	floatingContext: FloatingContext;
	reference: <T extends FloatingProps>(props?: T) => T & AttachmentProps;
	floating: <T extends FloatingProps>(props?: T) => T & AttachmentProps;
	setReference: (element: ReferenceElement | null) => void;
	updatePosition: () => Promise<void>;
	isOpen: () => boolean;
	contains: (target: EventTarget | null) => boolean;
};

export function resolve<T>(value: MaybeGetter<T> | undefined) {
	return typeof value === 'function' ? (value as () => T)() : value;
}
