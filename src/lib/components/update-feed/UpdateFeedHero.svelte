<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		imageUrl = null,
		imageAlt = '',
		loading = false,
		imagePending = false,
		onimageerror,
		fallbackIcon,
		actions
	}: {
		title: string;
		description?: string | null;
		imageUrl?: string | null;
		imageAlt?: string;
		loading?: boolean;
		imagePending?: boolean;
		onimageerror?: () => void | Promise<void>;
		fallbackIcon: Snippet;
		actions?: Snippet;
	} = $props();

	let failedImageUrl = $state<string | null>(null);
	let loadedImageUrl = $state<string | null>(null);
	let resolvingImageUrl = $state<string | null>(null);
	const canLoadImage = $derived(
		!loading && !imagePending && Boolean(imageUrl) && imageUrl !== failedImageUrl
	);
	const showImage = $derived(canLoadImage && imageUrl === loadedImageUrl);
	const showImageSkeleton = $derived(
		loading || imagePending || (!showImage && (canLoadImage || Boolean(resolvingImageUrl)))
	);

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

<header
	class="card card-sm md:card-md bg-base-200 overflow-hidden"
	aria-busy={loading || imagePending}
	aria-label={loading ? title : undefined}
>
	<div class="grid md:min-h-64 md:grid-cols-2">
		<figure class="bg-base-300 relative aspect-[2/1] md:aspect-auto">
			{#if showImageSkeleton}
				<div class="skeleton absolute inset-0 rounded-none" aria-hidden="true"></div>
			{:else if !showImage}
				<div class="absolute inset-0 flex items-center justify-center">
					{@render fallbackIcon()}
				</div>
			{/if}

			{#if canLoadImage && imageUrl}
				{#key imageUrl}
					<img
						class={['absolute inset-0 h-full w-full object-cover', !showImage && 'invisible']}
						src={imageUrl}
						alt={imageAlt}
						loading="lazy"
						onload={handleImageLoad}
						onerror={handleImageError}
					/>
				{/key}
			{/if}

			<div
				class="from-base-200 pointer-events-none absolute -inset-px bg-linear-to-t from-10% to-transparent to-60% md:bg-linear-to-l md:from-0%"
			></div>
		</figure>

		<!-- Negative margin floats the title onto the image's faded area on mobile. -->
		<div class="card-body relative -mt-14 justify-center md:mt-0">
			{#if loading}
				<div class="skeleton h-8 w-3/4 max-w-xl"></div>
				<div class="skeleton mt-2 h-4 w-full max-w-lg"></div>
			{:else}
				<h1 class="text-2xl font-bold text-pretty md:text-3xl">{title}</h1>
				{#if description}
					<p class="text-base-content/70 text-sm">{description}</p>
				{/if}
				{#if actions}
					<div class="mt-2">
						{@render actions()}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</header>
