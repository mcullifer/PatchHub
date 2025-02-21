import type { ISoftwareFeed } from '$lib/models/AtomFeed.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	if (!params.name) error(404, 'Software not found');
	const feed = await fetch('/api/software/mostpopular');
	const data = (await feed.json()) as ISoftwareFeed;
	return {
		softwareName: params.name,
		news: data.software
	};
}
