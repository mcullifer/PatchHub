import { ConvexCache } from '$lib/server/cache/ConvexCache';
import { getDefaultSteamHeaderImageUrl } from '$lib/util/SteamAssets';
import { Time } from '$lib/util/time';

const headerImageTtlMs = Time.DAY * 7;

type AppDetailsResponse = Record<
	string,
	{
		success: boolean;
		data?: {
			header_image: string;
		};
	}
>;

export async function resolveHeaderImageUrl(fetchFn: typeof fetch, appId: number) {
	try {
		const result = await new ConvexCache().getOrCreate(
			`steam:header:${appId}`,
			() => fetchHeaderImageUrl(fetchFn, appId),
			{ ttlMs: headerImageTtlMs }
		);
		return result?.value ?? null;
	} catch {
		return null;
	}
}

async function fetchHeaderImageUrl(fetchFn: typeof fetch, appId: number) {
	const defaultHeaderImageUrl = getDefaultSteamHeaderImageUrl(appId);
	if (await imageExists(fetchFn, defaultHeaderImageUrl)) {
		return defaultHeaderImageUrl;
	}

	const detailsHeaderImageUrl = await fetchDetailsHeaderImageUrl(fetchFn, appId);
	if (detailsHeaderImageUrl && (await imageExists(fetchFn, detailsHeaderImageUrl))) {
		return detailsHeaderImageUrl;
	}

	return null;
}

async function fetchDetailsHeaderImageUrl(fetchFn: typeof fetch, appId: number) {
	const params = new URLSearchParams({
		appids: appId.toString(),
		filters: 'basic'
	});

	try {
		const response = await fetchFn(`https://store.steampowered.com/api/appdetails?${params}`);
		if (!response.ok) return null;

		const details = (await response.json()) as AppDetailsResponse;
		return details[appId]?.data?.header_image || null;
	} catch {
		return null;
	}
}

async function imageExists(fetchFn: typeof fetch, url: string) {
	try {
		const response = await fetchFn(url, { method: 'HEAD' });
		return response.ok;
	} catch {
		return false;
	}
}
