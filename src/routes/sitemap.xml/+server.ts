import type { RequestHandler } from './$types';

const STATIC_ROUTES = ['/', '/privacy', '/terms'];

export const GET: RequestHandler = ({ url }) => {
	const urls = STATIC_ROUTES.map(
		(path) => `\t<url>\n\t\t<loc>${url.origin}${path}</loc>\n\t</url>`
	).join('\n');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

	return new Response(body, {
		headers: {
			'content-type': 'application/xml',
			'cache-control': 'public, max-age=3600'
		}
	});
};
