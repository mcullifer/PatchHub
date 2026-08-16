import { command, form, getRequestEvent, query } from '$app/server';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import { createSlug } from '$convex/lib/strings';
import { uploadImageToStorage } from '$lib/images/imageUpload';
import { IMAGE_UPLOAD_MAX_BYTES, getImageUploadValidationError } from '$lib/images/imageValidation';
import type { SoftwareSourceSummary } from '$lib/models/Software';
import { getAuthContext } from '$lib/server/auth/authContext';
import { createConvexClient, generateConvexBannerUploadUrl } from '$lib/server/convex';
import { boundedFetch } from '$lib/server/http/boundedFetch';
import { getSourceSummaries } from '$lib/server/software/updates';
import { error, invalid, type RequestEvent } from '@sveltejs/kit';
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
	bannerFile: v.optional(v.file()),
	bannerUrl: v.optional(v.union([v.literal(''), httpUrlSchema]), ''),
	bannerStorageId: v.optional(v.string()),
	bannerContentType: v.optional(v.string())
});

const updateSoftwareSourceRenderingSchema = v.object({
	slug: v.pipe(v.string(), v.trim(), v.minLength(1)),
	rendering: v.picklist(['excerpt', 'full'])
});

export const getSoftwareSourceSummaries = query(async (): Promise<SoftwareSourceSummary[]> => {
	const event = getRequestEvent();
	return getSourceSummaries(event.fetch);
});

export const generateSoftwareBannerUploadUrl = command(async () => {
	const event = getRequestEvent();
	await requireAdmin(event);

	return await generateConvexBannerUploadUrl(event);
});

export const createSoftwareSource = form(createSoftwareSourceSchema, async (input, issue) => {
	const event = getRequestEvent();
	await requireAdmin(event);
	const name = input.name.trim();
	const slug = createSlug(name, 'software');
	const convex = createConvexClient(event);

	const uploadedBanner = input.bannerFile?.size ? input.bannerFile : null;
	const bannerUrl = input.bannerUrl || null;
	let bannerStorageId = input.bannerStorageId as Id<'_storage'> | undefined;
	let bannerContentType = input.bannerContentType || undefined;
	if (uploadedBanner) {
		invalid(issue.bannerFile('Unable to upload the attached banner directly'));
	}
	if ((!bannerStorageId || !bannerContentType) && !bannerUrl) {
		invalid(issue.bannerFile('Choose a banner file or provide a banner URL'));
	}
	if (bannerStorageId && bannerUrl) {
		invalid(issue.bannerUrl('Choose a banner file or provide a banner URL, not both'));
	}

	if (bannerUrl) {
		let response: Response;
		try {
			response = await boundedFetch(event.fetch, bannerUrl, {
				timeoutMs: 10_000,
				maxBytes: IMAGE_UPLOAD_MAX_BYTES,
				userAgent: 'PatchHub/beta'
			});
		} catch {
			invalid(issue.bannerUrl('Unable to download a banner from that URL'));
		}
		if (!response.ok) {
			invalid(issue.bannerUrl(`Banner request failed with status ${response.status}`));
		}
		const banner = await response.blob();
		const bannerError = getImageUploadValidationError(banner, 'Banner image');
		if (bannerError) {
			invalid(issue.bannerUrl(bannerError));
		}

		const uploadUrl = await generateConvexBannerUploadUrl(event);
		try {
			bannerStorageId = await uploadImageToStorage(event.fetch, uploadUrl, banner);
			bannerContentType = banner.type;
		} catch {
			error(502, 'Unable to upload the software banner');
		}
	}
	if (!bannerStorageId || !bannerContentType) {
		invalid(issue.bannerFile('Choose a banner file or provide a banner URL'));
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
		bannerStorageId,
		bannerContentType
	});
	await getSoftwareSourceSummaries().refresh();

	return { id: source.id, slug: source.slug };
});

export const updateSoftwareSourceRendering = command(
	updateSoftwareSourceRenderingSchema,
	async (input) => {
		const event = getRequestEvent();
		await requireAdmin(event);

		await createConvexClient(event).mutation(api.catalog.updateSoftwareSourceRendering, input);
	}
);

async function requireAdmin(event: RequestEvent) {
	const { user } = await getAuthContext(event);
	if (user?.platformRole !== 'admin') error(403, 'Admin access required');
}
