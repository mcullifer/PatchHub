type SteamAppDetailsResponse = Record<
	string,
	{
		success?: boolean;
		data?: {
			header_image?: unknown;
		};
	}
>;

const steamHeaderImageCache = new Map<number, string | null>();

export function getDefaultSteamHeaderImageUrl(appid: number): string {
	return `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

export async function getSteamHeaderImageUrl(
	fetchFn: typeof fetch,
	appid: number
): Promise<string | null> {
	if (steamHeaderImageCache.has(appid)) {
		return steamHeaderImageCache.get(appid) ?? null;
	}

	const defaultHeaderImageUrl = getDefaultSteamHeaderImageUrl(appid);
	if (await imageExists(fetchFn, defaultHeaderImageUrl)) {
		steamHeaderImageCache.set(appid, defaultHeaderImageUrl);
		return defaultHeaderImageUrl;
	}

	const params = new URLSearchParams({
		appids: appid.toString(),
		filters: 'basic'
	});

	try {
		const response = await fetchFn(`https://store.steampowered.com/api/appdetails?${params}`);
		if (!response.ok) {
			steamHeaderImageCache.set(appid, null);
			return null;
		}

		const details = (await response.json()) as SteamAppDetailsResponse;
		const headerImage = details[appid]?.data?.header_image;
		const headerImageUrl =
			typeof headerImage === 'string' && headerImage.length > 0 ? headerImage : null;
		steamHeaderImageCache.set(appid, headerImageUrl);
		return headerImageUrl;
	} catch {
		steamHeaderImageCache.set(appid, null);
		return null;
	}
}

async function imageExists(fetchFn: typeof fetch, url: string): Promise<boolean> {
	try {
		const response = await fetchFn(url, { method: 'HEAD' });
		return response.ok;
	} catch {
		return false;
	}
}
