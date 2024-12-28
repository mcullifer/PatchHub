import type { ITopSteamGames } from '$lib/models/Steam';

export async function load({ fetch }) {
	const response = await fetch('api/games/mostpopular');
	const topGames = (await response.json()) as ITopSteamGames;
	return { topGames };
}
