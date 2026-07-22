import { Favorites } from '$lib/contexts/favorites.svelte';
import type { FavoriteItem } from '$lib/remote/favorites.remote';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => ({
	getFavorites: vi.fn(),
	setExternalItemFavorite: vi.fn(),
	setProjectFavorite: vi.fn()
}));

vi.mock('$lib/remote/favorites.remote', () => remote);

type FavoritesData = {
	items: FavoriteItem[];
	externalItemIds: Set<string>;
	projectIds: Set<string>;
};

function createQuery(data: FavoritesData) {
	return Object.assign(Promise.resolve(data), {
		current: data,
		error: undefined,
		loading: false,
		ready: true as const,
		set: vi.fn(),
		refresh: vi.fn(async () => undefined),
		withOverride: vi.fn()
	});
}

function createPendingQuery() {
	return Object.assign(Promise.resolve(emptyFavorites()), {
		current: undefined,
		error: undefined,
		loading: true,
		ready: false as const,
		set: vi.fn(),
		refresh: vi.fn(async () => undefined),
		withOverride: vi.fn()
	});
}

function createFailedQuery() {
	return Object.assign(Promise.resolve(emptyFavorites()), {
		current: undefined,
		error: new Error('Favorites unavailable'),
		loading: false,
		ready: false as const,
		set: vi.fn(),
		refresh: vi.fn(async () => undefined),
		withOverride: vi.fn()
	});
}

function commandResult<T>(value: T) {
	const request = Promise.resolve(value) as Promise<T> & {
		updates: ReturnType<typeof vi.fn>;
	};
	request.updates = vi.fn(async () => value);
	return request;
}

const game = {
	kind: 'game',
	id: 'item-1',
	favoritedAt: 1_000,
	appid: 10,
	name: 'Counter-Strike',
	slug: 'counter-strike',
	imageUrl: 'https://example.com/counter-strike.jpg',
	imageAlt: ''
} satisfies FavoriteItem;

const project = {
	kind: 'project',
	id: 'project-1',
	favoritedAt: 2_000,
	name: 'PatchHub',
	createdBy: 'max',
	slug: 'patchhub',
	imageUrl: null,
	imageAlt: ''
} satisfies FavoriteItem;

describe('Favorites', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('adds an external item to the retained query after the command succeeds', async () => {
		const query = createQuery(emptyFavorites());
		remote.setExternalItemFavorite.mockReturnValue(commandResult(game));
		const favorites = new Favorites(() => query);

		await favorites.toggleExternalItem('item-1');

		expect(remote.setExternalItemFavorite).toHaveBeenCalledWith({
			externalItemId: 'item-1',
			favorited: true
		});
		expect(query.set).toHaveBeenCalledWith({
			items: [game],
			externalItemIds: new Set(['item-1']),
			projectIds: new Set()
		});
	});

	it('removes an external item from the retained query after the command succeeds', async () => {
		const query = createQuery({
			items: [game],
			externalItemIds: new Set(['item-1']),
			projectIds: new Set()
		});
		remote.setExternalItemFavorite.mockReturnValue(commandResult(null));
		const favorites = new Favorites(() => query);

		await favorites.toggleExternalItem('item-1');

		expect(remote.setExternalItemFavorite).toHaveBeenCalledWith({
			externalItemId: 'item-1',
			favorited: false
		});
		expect(query.set).toHaveBeenCalledWith(emptyFavorites());
	});

	it('refreshes the retained query after favoriting before the initial query is ready', async () => {
		const query = createPendingQuery();
		const request = commandResult(game);
		remote.setExternalItemFavorite.mockReturnValue(request);
		const favorites = new Favorites(() => query);

		await favorites.toggleExternalItem('item-1');

		expect(remote.setExternalItemFavorite).toHaveBeenCalledWith({
			externalItemId: 'item-1',
			favorited: true
		});
		expect(request.updates).toHaveBeenCalledWith(query);
		expect(query.set).not.toHaveBeenCalled();
	});

	it('adds a project to the retained query after the command succeeds', async () => {
		const query = createQuery(emptyFavorites());
		remote.setProjectFavorite.mockReturnValue(commandResult(project));
		const favorites = new Favorites(() => query);

		await favorites.toggleProject('project-1');

		expect(remote.setProjectFavorite).toHaveBeenCalledWith({
			projectId: 'project-1',
			favorited: true
		});
		expect(query.set).toHaveBeenCalledWith({
			items: [project],
			externalItemIds: new Set(),
			projectIds: new Set(['project-1'])
		});
	});

	it('removes a project from the retained query after the command succeeds', async () => {
		const query = createQuery({
			items: [project],
			externalItemIds: new Set(),
			projectIds: new Set(['project-1'])
		});
		remote.setProjectFavorite.mockReturnValue(commandResult(null));
		const favorites = new Favorites(() => query);

		await favorites.toggleProject('project-1');

		expect(remote.setProjectFavorite).toHaveBeenCalledWith({
			projectId: 'project-1',
			favorited: false
		});
		expect(query.set).toHaveBeenCalledWith(emptyFavorites());
	});

	it('exposes failed queries and retries them', async () => {
		const query = createFailedQuery();
		const favorites = new Favorites(() => query);

		expect(favorites.failed).toBe(true);
		await favorites.retry();

		expect(query.refresh).toHaveBeenCalledOnce();
	});

	it('does not mutate favorites without an active user query', async () => {
		const favorites = new Favorites(() => null);

		await favorites.toggleProject('project-1');

		expect(remote.setProjectFavorite).not.toHaveBeenCalled();
	});
});

function emptyFavorites(): FavoritesData {
	return { items: [], externalItemIds: new Set(), projectIds: new Set() };
}
