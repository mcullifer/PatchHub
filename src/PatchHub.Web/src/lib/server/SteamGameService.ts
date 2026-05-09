import type { INamedSteamGame, ISteamApp } from '$lib/models/Steam';
import { db } from '$lib/server/db';
import { externalItem } from '$lib/server/db/schema';
import { getSearchTokens, normalizeSearchName } from '$lib/util/StringUtils';
import { and, asc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';

export class SteamGameService {
	static popularGames: { last_update: number; ranks: INamedSteamGame[] } = {
		last_update: 0,
		ranks: []
	};

	public static async getApp(appId: number) {
		const result = await db.query.externalItem.findFirst({
			where: (items, { and, eq }) =>
				and(eq(items.externalId, appId.toString()), eq(items.type, 'steam'))
		});
		if (!result) return;
		return result;
	}

	public static async getAppsByExternalId(appIds: number[]) {
		const result = await db.query.externalItem.findMany({
			where: (items, { and, inArray, eq }) =>
				and(
					inArray(
						items.externalId,
						appIds.map((a) => a.toString())
					),
					eq(items.type, 'steam')
				)
		});
		return result;
	}

	public static async getNamesForApps(appIds: number[]) {
		const res = await db
			.select({
				appid: externalItem.externalId,
				name: externalItem.name,
				slug: externalItem.slug
			})
			.from(externalItem)
			.where(
				and(
					inArray(
						externalItem.externalId,
						appIds.map((a) => a.toString())
					),
					isNotNull(externalItem.externalId),
					eq(externalItem.type, 'steam')
				)
			);
		const appNames: Record<string, { name: string; slug: string }> = {};
		for (const app of res) {
			if (app.appid === null || app.name === null) continue;
			appNames[app.appid] = { name: app.name, slug: app.slug };
		}
		return appNames;
	}

	public static async search(query: string) {
		const trimmedQuery = query.trim();
		const searchName = normalizeSearchName(trimmedQuery);
		const tokens = getSearchTokens(trimmedQuery);
		if (!searchName || tokens.length === 0) return [];

		const tokenConditions = tokens.map(
			(token) => sql`${externalItem.searchName} like ${`%${escapeLike(token)}%`} escape ${'\\'}`
		);
		const rank = sql<number>`case
			when ${externalItem.searchName} = ${searchName} then 0
			when ${externalItem.searchName} like ${`${escapeLike(searchName)}%`} escape ${'\\'} then 1
			when ${externalItem.name} like ${`${escapeLike(trimmedQuery)}%`} escape ${'\\'} then 2
			when ${externalItem.searchName} like ${`%${escapeLike(searchName)}%`} escape ${'\\'} then 3
			else 4
		end`;

		const result = await db
			.select({
				appid: externalItem.externalId,
				name: externalItem.name,
				slug: externalItem.slug,
				rank
			})
			.from(externalItem)
			.where(
				and(
					eq(externalItem.type, 'steam'),
					eq(externalItem.isSearchable, true),
					or(
						sql`${externalItem.name} like ${`%${escapeLike(trimmedQuery)}%`} escape ${'\\'}`,
						sql`${externalItem.searchName} like ${`%${escapeLike(searchName)}%`} escape ${'\\'}`,
						and(...tokenConditions)
					)
				)
			)
			.orderBy(asc(rank), asc(externalItem.name))
			.limit(20);
		if (!result || result.length === 0) return [];

		return result.map((g) => {
			return {
				appid: parseInt(g.appid!),
				name: g.name!,
				slug: g.slug
			};
		}) as ISteamApp[];
	}
}

function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
