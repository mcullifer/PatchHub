<script lang="ts">
	import DOMPurify from 'dompurify';
	import { onMount } from 'svelte';

	let { html }: { html: string } = $props();

	let canRenderSanitizedHtml = $state(false);

	onMount(() => {
		canRenderSanitizedHtml = true;
	});

	function youtubeEmbeds(container: HTMLElement) {
		const onerror = (event: Event) => {
			const image = event.target;
			if (!(image instanceof HTMLImageElement)) return;
			const fallback = image.dataset.fallbackSrc;
			if (!fallback) return;

			delete image.dataset.fallbackSrc;
			image.src = fallback;
		};

		const onclick = (event: MouseEvent) => {
			if (!(event.target instanceof Element)) return;
			const trigger = event.target.closest<HTMLElement>('[data-youtube-id]');
			const videoId = trigger?.dataset.youtubeId;
			if (!trigger || !videoId || !/^[a-zA-Z0-9_-]{6,32}$/.test(videoId)) return;

			const frame = document.createElement('iframe');
			frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
			frame.title = 'YouTube video player';
			frame.allow =
				'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
			frame.allowFullscreen = true;
			frame.className = 'rounded-box my-4 aspect-video w-full border-0';
			trigger.replaceWith(frame);
		};
		container.addEventListener('click', onclick);
		container.addEventListener('error', onerror, true);
		return () => {
			container.removeEventListener('click', onclick);
			container.removeEventListener('error', onerror, true);
		};
	}

	function carouselNav(container: HTMLElement) {
		const onclick = (event: MouseEvent) => {
			if (!(event.target instanceof Element)) return;
			const button = event.target.closest('[data-carousel-prev], [data-carousel-next]');
			const carousel = button?.parentElement?.querySelector('.carousel');
			if (!carousel) return;
			const direction = button?.hasAttribute('data-carousel-prev') ? -1 : 1;
			const itemWidth =
				carousel.querySelector('.carousel-item')?.clientWidth ?? carousel.clientWidth;
			carousel.scrollBy({ left: direction * itemWidth });
		};
		container.addEventListener('click', onclick);
		return () => container.removeEventListener('click', onclick);
	}
</script>

{#if canRenderSanitizedHtml}
	<div
		class="patchhub-rich-text prose prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content prose-a:link prose-a:link-primary prose-p:my-2 prose-ul:my-2 prose-headings:mt-6 prose-headings:mb-2 max-w-none"
		{@attach carouselNav}
		{@attach youtubeEmbeds}
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html DOMPurify.sanitize(html)}
	</div>
{:else}
	<div class="skeleton min-h-64 w-full" role="status" aria-label="Loading article content"></div>
{/if}
