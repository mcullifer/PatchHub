import type { INamedSteamGame, ISteamApp } from '$lib/models/Steam';
import { db } from '$lib/server/db';
import { externalItem } from '$lib/server/db/schema';
import { and, eq, inArray, isNotNull, like } from 'drizzle-orm';

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
				name: externalItem.name
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
		const appNames: Record<string, string> = {};
		for (const app of res) {
			if (app.appid === null || app.name === null) continue;
			appNames[app.appid] = app.name;
		}
		return appNames;
	}

	public static async search(query: string) {
		const result = await db
			.select({
				appid: externalItem.externalId,
				name: externalItem.name
			})
			.from(externalItem)
			.where(and(like(externalItem.name, `%${query}%`), eq(externalItem.type, 'steam')))
			.limit(20);
		if (!result || result.length === 0) return [];

		return result.map((g) => {
			return {
				appid: parseInt(g.appid!),
				name: g.name!
			};
		}) as ISteamApp[];
	}
}
