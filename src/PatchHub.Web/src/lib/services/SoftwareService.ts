import type { ISoftwareFeed } from '$lib/models/AtomFeed';

export class SoftwareService {
	private fetchFn: typeof fetch;

	constructor(fetchFn?: typeof fetch) {
		this.fetchFn = fetchFn || fetch;
	}

	async mostPopular(): Promise<ISoftwareFeed | null> {
		try {
			const response = await this.fetchFn('/api/software/mostpopular');
			return response.json() as Promise<ISoftwareFeed>;
		} catch (e) {
			console.error(e);
			return null;
		}
	}
}
