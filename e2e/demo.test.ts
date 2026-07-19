import { expect, test } from '@playwright/test';

test('home page renders the Games section', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible();
});

test('home page serves share metadata', async ({ request }) => {
	const html = await (await request.get('/')).text();
	expect(html).toContain('property="og:title"');
	expect(html).toContain('name="description"');
});

test('privacy and terms pages render', async ({ page }) => {
	await page.goto('/privacy');
	await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible();
	await page.goto('/terms');
	await expect(page.getByRole('heading', { name: 'Terms of Use' })).toBeVisible();
});

test('footer links to privacy and terms', async ({ page }) => {
	await page.goto('/');
	const footer = page.locator('footer');
	await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible();
	await expect(footer.getByRole('link', { name: 'Terms' })).toBeVisible();
});

test('unknown pages return 404', async ({ request }) => {
	expect((await request.get('/this-page-does-not-exist')).status()).toBe(404);
	expect((await request.get('/no-owner/no-project/no-post')).status()).toBe(404);
});

test('demo playground is not reachable in the production build', async ({ request }) => {
	expect((await request.get('/demo')).status()).toBe(404);
});

test('robots.txt and sitemap.xml are served', async ({ request }) => {
	const robots = await request.get('/robots.txt');
	expect(robots.status()).toBe(200);
	expect(await robots.text()).toContain('Sitemap:');
	const sitemap = await request.get('/sitemap.xml');
	expect(sitemap.status()).toBe(200);
	expect(sitemap.headers()['content-type']).toContain('xml');
});
