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

	async add(id: number) {
		try {
			return await this.fetchFn('/api/favorites', {
				method: 'POST',
				body: JSON.stringify({ catalogId: id })
			});
		} catch (e) {
			console.error(e);
			return new Response('Failed to add favorite', { status: 500 });
		}
	}

	async remove(id: number) {
		try {
			return await this.fetchFn(`/api/favorites/${id}`, { method: 'DELETE' });
		} catch (e) {
			console.error(e);
			return new Response('Failed to remove favorite', { status: 500 });
		}
	}
}
