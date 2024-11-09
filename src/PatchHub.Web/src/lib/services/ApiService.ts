import type { ISteamAppNews } from '$lib/models/Steam';

export class ApiService {
	static async getNews(
		appid: number,
		count: number = 10,
		fetchFn?: typeof fetch
	): Promise<ISteamAppNews | null> {
		if (!fetchFn) fetchFn = fetch;
		try {
			const response = await fetchFn(`/api/games/news?appid=${appid}&count=${count}`);
			return response.json();
		} catch (e) {
			console.error(e);
			return null;
		}
	}
}
