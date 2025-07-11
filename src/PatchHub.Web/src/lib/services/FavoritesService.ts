type CatalogItem = {
	id: number;
	name: string;
	normalizedName: string;
	type: string;
	createdBy: string;
	externalId: string | null;
};

export class FavoritesService {
	private fetchFn: typeof fetch;

	constructor(fetchFn?: typeof fetch) {
		this.fetchFn = fetchFn || fetch;
	}

	async get() {
		try {
			const response = await this.fetchFn('/api/favorites');
			return (await response.json()) as { favorites: CatalogItem[] };
		} catch (e) {
			console.error(e);
			return { favorites: [] };
		}
	}

	async remove(id: number) {
		try {
			await this.fetchFn(`/api/favorites/${id}`, { method: 'DELETE' });
		} catch (e) {
			console.error(e);
		}
	}
}
