export function getDefaultSteamHeaderImageUrl(appid: number): string {
	return `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

/** Wide-format (3840x1240) banner art Steam designs for hero layouts; not every app has one. */
export function getSteamLibraryHeroUrl(appid: number): string {
	return `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_hero.jpg`;
}
