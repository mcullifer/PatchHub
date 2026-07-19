import { createSlug } from '$convex/lib/strings';

export type SteamRouteItem = {
	appid: number;
	name?: string;
	slug?: string | null;
};

export function getSteamGamePath(game: SteamRouteItem): string {
	const appid = game.appid.toString();
	const slug = game.slug || (game.name ? createSlug(game.name, appid) : appid);
	return `/steam/${appid}/${slug}`;
}
