<script lang="ts">
	import DOMPurify from 'dompurify';
	import { onMount } from 'svelte';

	let { html, baseUrl = null }: { html: string; baseUrl?: string | null } = $props();

	let canRenderSanitizedHtml = $state(false);
	const sanitizedHtml = $derived(canRenderSanitizedHtml ? sanitizeRichTextHtml(html, baseUrl) : '');

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

	function sanitizeRichTextHtml(value: string, documentUrl: string | null): string {
		const content = DOMPurify.sanitize(value, {
			ADD_TAGS: ['iframe'],
			ADD_ATTR: ['allowfullscreen'],
			RETURN_DOM: true
		});
		if (!(content instanceof HTMLElement)) return '';

		resolveRelativeUrls(content, documentUrl);
		for (const frame of content.querySelectorAll<HTMLIFrameElement>('iframe[src]')) {
			const videoId = getYouTubeVideoId(frame.getAttribute('src'), documentUrl);
			if (videoId) {
				frame.replaceWith(createYouTubeFacade(videoId, frame.title));
			} else {
				frame.remove();
			}
		}

		return DOMPurify.sanitize(content.innerHTML);
	}

	function resolveRelativeUrls(content: HTMLElement, documentUrl: string | null): void {
		if (!documentUrl) return;

		for (const [selector, attribute] of [
			['a[href]', 'href'],
			['img[src]', 'src'],
			['source[src]', 'src'],
			['video[src]', 'src'],
			['video[poster]', 'poster']
		] as const) {
			for (const element of content.querySelectorAll(selector)) {
				const value = element.getAttribute(attribute);
				if (!value) continue;

				try {
					element.setAttribute(attribute, new URL(value, documentUrl).href);
				} catch {
					// DOMPurify removes malformed and unsafe URLs in the final pass.
				}
			}
		}
	}

	function getYouTubeVideoId(value: string | null, documentUrl: string | null): string | null {
		if (!value) return null;

		try {
			const url = new URL(value, documentUrl ?? window.location.origin);
			if (!['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
				return null;
			}

			const match = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{6,32})/);
			return match?.[1] ?? null;
		} catch {
			return null;
		}
	}

	function createYouTubeFacade(videoId: string, title: string): HTMLButtonElement {
		const preview = document.createElement('button');
		preview.type = 'button';
		preview.className =
			'not-prose group rounded-box relative my-4 block w-full cursor-pointer overflow-hidden bg-black';
		preview.dataset.youtubeId = videoId;
		preview.setAttribute('aria-label', title ? `Play ${title}` : 'Play YouTube video');
		preview.innerHTML = `<img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg" data-fallback-src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="" loading="lazy" class="aspect-video w-full object-cover transition-opacity group-hover:opacity-75" /><span class="pointer-events-none absolute inset-0 flex items-center justify-center"><span class="flex h-12 w-[4.5rem] items-center justify-center rounded-xl bg-black/70 text-lg text-white transition-colors group-hover:bg-red-600">&#9654;</span></span>`;
		return preview;
	}
</script>

{#if canRenderSanitizedHtml}
	<div
		class="patchhub-rich-text prose prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content prose-a:link prose-a:link-primary prose-p:my-2 prose-ul:my-2 prose-headings:mt-6 prose-headings:mb-2 prose-hr:my-4 max-w-none min-w-0"
		{@attach carouselNav}
		{@attach youtubeEmbeds}
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html sanitizedHtml}
	</div>
{:else}
	<div class="skeleton min-h-64 w-full" role="status" aria-label="Loading article content"></div>
{/if}

<style>
	.patchhub-rich-text {
		overflow-wrap: anywhere;
	}

	.patchhub-rich-text :global(img),
	.patchhub-rich-text :global(video),
	.patchhub-rich-text :global(iframe) {
		max-width: 100%;
	}
</style>
