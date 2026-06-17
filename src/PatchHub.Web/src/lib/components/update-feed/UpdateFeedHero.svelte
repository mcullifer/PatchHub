<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		imageUrl = null,
		imageAlt = '',
		onimageerror,
		fallbackIcon
	}: {
		title: string;
		description: string;
		imageUrl?: string | null;
		imageAlt?: string;
		onimageerror?: () => void | Promise<void>;
		fallbackIcon: Snippet;
	} = $props();

	let failedImageUrl = $state<string | null>(null);
	let loadedImageUrl = $state<string | null>(null);
	let resolvingImageUrl = $state<string | null>(null);
	const canLoadImage = $derived(Boolean(imageUrl) && imageUrl !== failedImageUrl);
	const showImage = $derived(canLoadImage && imageUrl === loadedImageUrl);
	const showImageSkeleton = $derived(!showImage && (canLoadImage || Boolean(resolvingImageUrl)));
	const showFallbackIcon = $derived(!showImage && !showImageSkeleton);

	function handleImageLoad(): void {
		loadedImageUrl = imageUrl;
	}

	async function handleImageError(): Promise<void> {
		const failedUrl = imageUrl;
		if (!failedUrl) return;

		failedImageUrl = failedUrl;
		if (loadedImageUrl === failedUrl) {
			loadedImageUrl = null;
		}

		if (!onimageerror) return;

		resolvingImageUrl = failedUrl;
		try {
			await onimageerror();
		} catch {
			// Failed recovery leaves the regular fallback icon visible.
		} finally {
			if (resolvingImageUrl === failedUrl) {
				resolvingImageUrl = null;
			}
		}
	}
</script>

<header class="card bg-base-200 overflow-hidden">
	<div class="grid min-h-64 lg:grid-cols-2">
		<figure class="bg-base-300 relative min-h-64 overflow-hidden">
			{#if showImageSkeleton}
				<div class="skeleton absolute inset-0 h-full w-full rounded-none" aria-hidden="true"></div>
			{:else if showFallbackIcon}
				<div class="absolute inset-0 flex h-full min-h-64 items-center justify-center">
					{@render fallbackIcon()}
				</div>
			{/if}

			{#if canLoadImage && imageUrl}
				<img
					class={[
						'absolute inset-0 h-full w-full object-cover object-bottom',
						!showImage && 'invisible'
					]}
					src={imageUrl}
					alt={imageAlt}
					loading="lazy"
					onload={handleImageLoad}
					onerror={handleImageError}
				/>
			{/if}

			<div class="hero-image-fade pointer-events-none absolute inset-0"></div>
		</figure>

		<div class="card-body justify-center">
			<h1 class="max-w-3xl text-3xl leading-tight font-bold text-pretty">
				{title}
			</h1>
			<p class="text-base-content/70 max-w-2xl text-sm leading-6">
				{description}
			</p>
		</div>
	</div>
</header>

<style>
	.hero-image-fade {
		background: linear-gradient(
			to bottom,
			transparent 50%,
			color-mix(in oklch, var(--color-base-200) 65%, transparent) 78%,
			var(--color-base-200)
		);
	}

	@media (min-width: 64rem) {
		.hero-image-fade {
			background: linear-gradient(
				to right,
				transparent 42%,
				color-mix(in oklch, var(--color-base-200) 65%, transparent) 76%,
				var(--color-base-200)
			);
		}
	}
</style>
