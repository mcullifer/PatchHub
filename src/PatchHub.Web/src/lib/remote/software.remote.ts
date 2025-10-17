import { query } from '$app/server';
import type { ISoftwareFeed } from '$lib/models/AtomFeed';
import { AtomFeedService } from '$lib/server/AtomFeedService';

export const getMostPopularSoftware = query(async (): Promise<ISoftwareFeed | null> => {
	const feed = await AtomFeedService.getFeed('windows11');

	// Sort items by date (newest first) and limit to 25
	const sortedItems = [...feed.items]
		.sort((a, b) => {
			const aDate = new Date(a.published!);
			const bDate = new Date(b.published!);
			return bDate.getTime() - aDate.getTime();
		})
		.slice(0, 25);

	// Create a new feed object with limited items
	const limitedFeed = Object.assign(Object.create(Object.getPrototypeOf(feed)), {
		...feed,
		items: sortedItems
	});

	return { software: limitedFeed };
});
