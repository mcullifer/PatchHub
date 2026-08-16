import { command, form, getRequestEvent, query } from '$app/server';
import { api } from '$convex/_generated/api';
import {
	IMAGE_UPLOAD_MAX_BYTES,
	getImageUploadValidationError,
	uploadImageToConvexStorage
} from '$convex/lib/imageUpload';
import { createSlug } from '$convex/lib/strings';
import type { SoftwareSourceSummary } from '$lib/models/Software';
import { getAuthContext } from '$lib/server/auth/authContext';
import { createConvexClient } from '$lib/server/convex';
import { boundedFetch } from '$lib/server/http/boundedFetch';
import { getSourceSummaries } from '$lib/server/software/updates';
import { error, invalid } from '@sveltejs/kit';
import * as v from 'valibot';

const httpUrlSchema = v.pipe(
	v.string(),
	v.trim(),
	v.url('Enter a valid URL'),
	v.check(
		(url) => ['http:', 'https:'].includes(new URL(url).protocol),
		'Enter an HTTP or HTTPS URL'
	)
);

const createSoftwareSourceSchema = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
	feedUrl: httpUrlSchema,
	imageFile: v.optional(v.file()),
	imageUrl: v.optional(v.union([v.literal(''), httpUrlSchema]), '')
});

const updateSoftwareSourceRenderingSchema = v.object({
	slug: v.pipe(v.string(), v.trim(), v.minLength(1)),
	rendering: v.picklist(['excerpt', 'full'])
});

export const getSoftwareSourceSummaries = query(async (): Promise<SoftwareSourceSummary[]> => {
	const event = getRequestEvent();
	return getSourceSummaries(event.fetch);
});

export const createSoftwareSource = form(createSoftwareSourceSchema, async (input, issue) => {
	const event = getRequestEvent();
	const { user } = await getAuthContext(event);
	if (user?.platformRole !== 'admin') {
		error(403, 'Admin access required');
	}
	const name = input.name.trim();
	const slug = createSlug(name, 'software');
	const convex = createConvexClient(event);
	const uploadUrl = await convex.mutation(api.catalog.generateSoftwareSourceImageUploadUrl, {
		slug
	});

	const uploadedImage = input.imageFile?.size ? input.imageFile : null;
	const imageUrl = input.imageUrl || null;
	if (!uploadedImage && !imageUrl) {
		invalid(issue.imageFile('Choose an image file or provide an image URL'));
	}
	if (uploadedImage && imageUrl) {
		invalid(issue.imageUrl('Choose an image file or provide an image URL, not both'));
	}

	let image: Blob;
	if (uploadedImage) {
		image = uploadedImage;
	} else if (imageUrl) {
		let response: Response;
		try {
			response = await boundedFetch(event.fetch, imageUrl, {
				timeoutMs: 10_000,
				maxBytes: IMAGE_UPLOAD_MAX_BYTES,
				userAgent: 'PatchHub/beta'
			});
		} catch {
			invalid(issue.imageUrl('Unable to download an image from that URL'));
		}
		if (!response.ok) {
			invalid(issue.imageUrl(`Image request failed with status ${response.status}`));
		}
		image = await response.blob();
	} else {
		invalid(issue.imageFile('Choose an image file or provide an image URL'));
	}

	const imageError = await getImageUploadValidationError(image, 'Card image');
	if (imageError) {
		invalid(uploadedImage ? issue.imageFile(imageError) : issue.imageUrl(imageError));
	}

	let imageStorageId;
	try {
		imageStorageId = await uploadImageToConvexStorage(event.fetch, uploadUrl, image);
	} catch {
		error(502, 'Unable to upload the software source image');
	}

	const metadataJson = JSON.stringify({
		vendor: name,
		provider: name,
		sourceType: 'RSS/Atom feed',
		adapter: 'atom-feed',
		rendering: 'full',
		feedUrl: input.feedUrl,
		searchUrl: null,
		supportUrl: null,
		releaseInfoUrl: null
	});
	const source = await convex.mutation(api.catalog.createSoftwareSource, {
		name,
		slug,
		metadataJson,
		imageStorageId,
		imageContentType: image.type
	});

	return { id: source.id, slug: source.slug };
});

export const updateSoftwareSourceRendering = command(
	updateSoftwareSourceRenderingSchema,
	async (input) => {
		const event = getRequestEvent();
		const { user } = await getAuthContext(event);
		if (user?.platformRole !== 'admin') {
			error(403, 'Admin access required');
		}

		await createConvexClient(event).mutation(api.catalog.updateSoftwareSourceRendering, input);
	}
);
