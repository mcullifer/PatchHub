import { command, getRequestEvent, query, requested } from '$app/server';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import { captureServerEvent } from '$lib/server/analytics';
import { requireAuth } from '$lib/server/auth/authContext';
import { createConvexClient } from '$lib/server/convex';
import { getSoftwareSource } from '$lib/server/software/SoftwareSourceRegistry';
import { getDefaultSteamHeaderImageUrl } from '$lib/util/SteamAssets';
import * as v from 'valibot';

const externalItemFavoriteSchema = v.object({
	externalItemId: v.string(),
	favorited: v.boolean()
});

const projectFavoriteSchema = v.object({
	projectId: v.string(),
	favorited: v.boolean()
});

type FavoriteItemBase = {
	id: string;
	favoritedAt: number;
	name: string;
	imageUrl: string | null;
	imageAlt: string;
};

export type FavoriteItem =
	| (FavoriteItemBase & {
			kind: 'game';
			appid: number;
			slug: string;
	  })
	| (FavoriteItemBase & {
			kind: 'software';
			slug: string;
	  })
	| (FavoriteItemBase & {
			kind: 'project';
			createdBy: string;
			slug: string;
	  });

export type FavoritesData = {
	items: FavoriteItem[];
	externalItemIds: Set<string>;
	projectIds: Set<string>;
};

type ExternalItemData = {
	id: string;
	favoritedAt: number;
	name: string;
	type: string;
	externalId: string | null;
	slug: string;
};

type ProjectData = {
	id: string;
	favoritedAt: number;
	name: string;
	createdBy: string;
	slug: string;
	bannerUrl: string | null;
};

export const getFavorites = query(async (): Promise<FavoritesData> => {
	const event = getRequestEvent();
	if (!event.locals.auth.user) {
		return { items: [], externalItemIds: new Set(), projectIds: new Set() };
	}

	const convex = createConvexClient(event);
	const favorites = await convex.query(api.favorites.list, {});
	const items: FavoriteItem[] = [];
	const externalItemIds = new Set<string>();
	const projectIds = new Set<string>();

	for (const item of favorites.externalItems) {
		externalItemIds.add(item.id);
		const favorite = toExternalItem(item);
		if (favorite) items.push(favorite);
	}

	for (const project of favorites.projects) {
		projectIds.add(project.id);
		items.push(toProject(project));
	}

	items.sort((left, right) => right.favoritedAt - left.favoritedAt);

	return { items, externalItemIds, projectIds };
});

export const setExternalItemFavorite = command(
	externalItemFavoriteSchema,
	async ({ externalItemId, favorited }) => {
		const event = getRequestEvent();
		const user = requireAuth(event);
		const convex = createConvexClient(event);

		const item = await convex.mutation(api.favorites.setExternalItem, {
			externalItemId: externalItemId as Id<'externalItems'>,
			favorited
		});
		await captureServerEvent(event, user.id, {
			name: favorited ? 'external item favorite added' : 'external item favorite removed'
		});
		await requested(getFavorites, 1).refreshAll();

		return item ? toExternalItem(item) : null;
	}
);

export const setProjectFavorite = command(
	projectFavoriteSchema,
	async ({ projectId, favorited }) => {
		const event = getRequestEvent();
		const user = requireAuth(event);
		const convex = createConvexClient(event);

		const project = await convex.mutation(api.favorites.setProject, {
			projectId: projectId as Id<'projects'>,
			favorited
		});
		await captureServerEvent(event, user.id, {
			name: favorited ? 'project favorite added' : 'project favorite removed'
		});
		await requested(getFavorites, 1).refreshAll();

		return project ? toProject(project) : null;
	}
);

function toExternalItem(item: ExternalItemData): FavoriteItem | null {
	if (item.type === 'steam' && item.externalId) {
		const appid = Number(item.externalId);
		if (!Number.isSafeInteger(appid) || appid <= 0) return null;

		return {
			kind: 'game',
			id: item.id,
			favoritedAt: item.favoritedAt,
			appid,
			name: item.name,
			slug: item.slug,
			imageUrl: getDefaultSteamHeaderImageUrl(appid),
			imageAlt: ''
		};
	}

	if (item.type !== 'software') return null;

	const source = getSoftwareSource(item.externalId ?? item.slug);
	if (!source) return null;

	return {
		kind: 'software',
		id: item.id,
		favoritedAt: item.favoritedAt,
		name: source.name,
		slug: source.slug,
		imageUrl: source.imageUrl,
		imageAlt: source.imageAlt
	};
}

function toProject(project: ProjectData): FavoriteItem {
	return {
		kind: 'project',
		id: project.id,
		favoritedAt: project.favoritedAt,
		name: project.name,
		createdBy: project.createdBy,
		slug: project.slug,
		imageUrl: project.bannerUrl,
		imageAlt: ''
	};
}
