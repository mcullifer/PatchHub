import { AtomFeedService } from '$lib/server/AtomFeedService';
import { json } from '@sveltejs/kit';

export async function GET({ setHeaders }) {
	const feed = await AtomFeedService.getFeed('windows11');
	setHeaders({ 'Cache-Control': 'max-age=300' });
	feed.items.sort((a, b) => {
		const aDate = new Date(a.published!);
		const bDate = new Date(b.published!);
		return bDate.getTime() - aDate.getTime();
	});
	const result = {
		...feed,
		items: feed.items.slice(0, 25)
	};
	return json({ software: result });
}
