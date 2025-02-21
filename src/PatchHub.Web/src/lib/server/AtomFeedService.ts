import { parseFeed } from '@rowanmanning/feed-parser';

export const AtomFeeds = {
	windows11: 'https://support.microsoft.com/en-us/feed/atom/4ec863cc-2ecd-e187-6cb3-b50c6545db92'
} as const;

export class AtomFeedService {
	static async getFeed(feed: keyof typeof AtomFeeds) {
		const response = await fetch(AtomFeeds[feed]);
		const data = await response.text();
		const parsed = parseFeed(data);
		return parsed;
	}
}
