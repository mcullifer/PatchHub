import { createContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import {
	getFavorites,
	setExternalItemFavorite,
	setProjectFavorite
} from '$lib/remote/favorites.remote';
import type { FavoriteItem } from '$lib/remote/favorites.remote';

type FavoritesData = Awaited<ReturnType<typeof getFavorites>>;
type FavoritesQuery = ReturnType<typeof getFavorites>;

export class Favorites {
	private readonly getQuery: () => FavoritesQuery | null;

	constructor(getQuery: () => FavoritesQuery | null) {
		this.getQuery = getQuery;
	}

	private get data(): FavoritesData | undefined {
		return this.getQuery()?.current;
	}

	get items(): readonly FavoriteItem[] {
		return this.data?.items ?? [];
	}

	get loading(): boolean {
		const query = this.getQuery();
		return Boolean(query && !query.ready && query.loading);
	}

	get failed(): boolean {
		const query = this.getQuery();
		return Boolean(query && !query.ready && query.error);
	}

	private setExternalItem(
		query: FavoritesQuery,
		externalItemId: string,
		favorited: boolean,
		item: FavoriteItem | null
	): void {
		if (!query.ready) return;

		const externalItemIds = new SvelteSet(query.current.externalItemIds);
		let items = query.current.items;

		if (favorited) {
			externalItemIds.add(externalItemId);
			if (item) {
				items = [item, ...items.filter(({ id }) => id !== item.id)];
			}
		} else {
			externalItemIds.delete(externalItemId);
			items = items.filter(({ id }) => id !== externalItemId);
		}

		query.set({
			...query.current,
			items,
			externalItemIds
		});
	}

	private setProject(
		query: FavoritesQuery,
		projectId: string,
		favorited: boolean,
		item: FavoriteItem | null
	): void {
		if (!query.ready) return;

		const projectIds = new SvelteSet(query.current.projectIds);
		let items = query.current.items;

		if (favorited) {
			projectIds.add(projectId);
			if (item) {
				items = [item, ...items.filter(({ id }) => id !== item.id)];
			}
		} else {
			projectIds.delete(projectId);
			items = items.filter(({ id }) => id !== projectId);
		}

		query.set({
			...query.current,
			items,
			projectIds
		});
	}

	isExternalItemFavorited(externalItemId: string): boolean {
		return this.data?.externalItemIds.has(externalItemId) ?? false;
	}

	isProjectFavorited(projectId: string): boolean {
		return this.data?.projectIds.has(projectId) ?? false;
	}

	async toggleExternalItem(externalItemId: string): Promise<void> {
		const query = this.getQuery();
		if (!query) return;

		try {
			const favorited = query.ready ? !query.current.externalItemIds.has(externalItemId) : true;
			const request = setExternalItemFavorite({ externalItemId, favorited });

			if (!query.ready) {
				await request.updates(query);
				return;
			}

			const item = await request;
			this.setExternalItem(query, externalItemId, favorited, item);
		} catch {
			// Keep the last confirmed value when the command fails.
		}
	}

	async toggleProject(projectId: string): Promise<void> {
		const query = this.getQuery();
		if (!query) return;

		try {
			const favorited = query.ready ? !query.current.projectIds.has(projectId) : true;
			const request = setProjectFavorite({ projectId, favorited });

			if (!query.ready) {
				await request.updates(query);
				return;
			}

			const item = await request;
			this.setProject(query, projectId, favorited, item);
		} catch {
			// Keep the last confirmed value when the command fails.
		}
	}

	async retry(): Promise<void> {
		try {
			await this.getQuery()?.refresh();
		} catch {
			// The query retains its error for the UI to display.
		}
	}
}

export const [useFavorites, setFavorites] = createContext<Favorites>();
