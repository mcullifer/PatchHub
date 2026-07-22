<script lang="ts">
	import type { Attachment } from 'svelte/attachments';

	let {
		value,
		startValue = 0,
		delay = 0,
		decimalPlaces = 0,
		class: className = '',
		prefix = '',
		suffix = '',
		once = true
	}: {
		value: number;
		startValue?: number;
		delay?: number;
		decimalPlaces?: number;
		class?: string;
		prefix?: string;
		suffix?: string;
		once?: boolean;
	} = $props();

	const format = (n: number) =>
		`${prefix}${new Intl.NumberFormat('en-US', {
			minimumFractionDigits: decimalPlaces,
			maximumFractionDigits: decimalPlaces
		}).format(Number(n.toFixed(decimalPlaces)))}${suffix}`;

	// Dependency-free spring, driven imperatively via textContent so the count-up
	// doesn't churn Svelte reactivity every frame.
	const damping = 60;
	const stiffness = 100;

	function animate(node: HTMLElement) {
		const startTime = performance.now();
		let velocity = 0;
		let position = startValue;
		function step(now: number) {
			const acceleration = -stiffness * (position - value) - damping * velocity;
			velocity += acceleration * (16.67 / 1000);
			position += velocity * (16.67 / 1000);
			const settled = Math.abs(velocity) < 0.01 && Math.abs(position - value) < 0.01;
			if (!settled && now - startTime < 4000) {
				node.textContent = format(position);
				requestAnimationFrame(step);
			} else {
				node.textContent = format(value);
			}
		}
		requestAnimationFrame(step);
	}

	// Markup renders the final value for SSR/no-JS. On the client we drop to the
	// start value and count up once the element scrolls into view; reduced-motion
	// leaves the final value in place.
	const ticker: Attachment<HTMLElement> = (node) => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		node.textContent = format(startValue);
		let timer: ReturnType<typeof setTimeout> | undefined;
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				if (once) observer.disconnect();
				timer = setTimeout(() => animate(node), delay);
			}
		});
		observer.observe(node);
		return () => {
			clearTimeout(timer);
			observer.disconnect();
		};
	};
</script>

<span class={['inline-block tabular-nums', className]} {@attach ticker}>{format(value)}</span>
