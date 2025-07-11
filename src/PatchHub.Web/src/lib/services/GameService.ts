import type { ISteamAppNews, ITopSteamGames } from '$lib/models/Steam';

export class GameService {
	private fetchFn: typeof fetch;

	constructor(fetchFn?: typeof fetch) {
		this.fetchFn = fetchFn || fetch;
	}

	async news(appid: number, count: number = 10): Promise<ISteamAppNews> {
		try {
			const response = await this.fetchFn(`/api/games/news?appid=${appid}&count=${count}`);
			return response.json();
		} catch (e) {
			console.error(e);
			return {
				appid,
				count: 0,
				newsitems: []
			};
		}
	}

	async mostPopular(): Promise<ITopSteamGames> {
		try {
			const response = await this.fetchFn('/api/games/mostpopular');
			return response.json() as Promise<ITopSteamGames>;
		} catch (e) {
			console.error(e);
			return {
				last_update: 0,
				ranks: []
			};
		}
	}
}
