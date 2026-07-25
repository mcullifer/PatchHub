import type { SoftwareSource, SoftwareUpdateEntry } from '$lib/models/Software';
import { UPSTREAM_FETCH_OPTIONS, boundedFetch } from '$lib/server/http/boundedFetch';

const nvidiaBaseUrl = 'https://www.nvidia.com';
const nvidiaMonths: Record<string, number> = {
	January: 0,
	February: 1,
	March: 2,
	April: 3,
	May: 4,
	June: 5,
	July: 6,
	August: 7,
	September: 8,
	October: 9,
	November: 10,
	December: 11
};

export async function fetchNvidiaGameReadyDrivers(
	source: SoftwareSource,
	fetchFn: typeof fetch = fetch
): Promise<SoftwareUpdateEntry[]> {
	const response = await boundedFetch(fetchFn, source.upstreamUrl, UPSTREAM_FETCH_OPTIONS);

	if (!response.ok) {
		throw new Error(`NVIDIA driver search returned ${response.status}`);
	}

	return parseNvidiaDriverSearchHtml(await response.text());
}

export function parseNvidiaDriverSearchHtml(html: string): SoftwareUpdateEntry[] {
	return getDriverBlocks(html)
		.map(parseDriverBlock)
		.filter((entry): entry is SoftwareUpdateEntry => entry !== null);
}

function getDriverBlocks(html: string): string[] {
	const matches = [
		...html.matchAll(/<a\b[^>]*href=["']([^"']*driverResults\.aspx\/\d+[^"']*)["'][^>]*>/gi)
	];
	const blocks: string[] = [];

	for (let index = 0; index < matches.length; index += 1) {
		const match = matches[index];
		if (match.index === undefined) continue;

		const next = matches[index + 1]?.index ?? html.length;
		const block = html.slice(match.index, next);
		if (htmlToText(block).includes('GeForce Game Ready Driver')) {
			blocks.push(block);
		}
	}

	return blocks;
}

function parseDriverBlock(block: string): SoftwareUpdateEntry | null {
	const text = htmlToText(block);
	const header = text.match(
		/GeForce Game Ready Driver\s*(?:\^?\{?WHQL\}?)?\s*([\d.]+)\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/
	);
	if (!header) return null;

	const version = header[1];
	const publishedAt = normalizeNvidiaDate(header[2]);
	const sourceUrl = getDriverDetailsUrl(block) ?? '';
	const releaseNotesUrl = getLinkUrl(block, 'Release Notes');
	const downloadUrl = getLinkUrl(block, 'Download');
	const contentText = getReleaseContentText(text);

	return {
		id: `nvidia-game-ready-driver-${version}`,
		title: `GeForce Game Ready Driver ${version}`,
		summary: getSummary(contentText),
		contentHtml: renderReleaseHtml(contentText, releaseNotesUrl, downloadUrl),
		sourceUrl,
		publishedAt,
		updatedAt: null,
		authors: ['NVIDIA'],
		metadata: {
			updateType: 'Game Ready Driver',
			driverVersion: version,
			...(releaseNotesUrl ? { releaseNotesUrl } : {}),
			...(downloadUrl ? { downloadUrl } : {})
		}
	};
}

function getDriverDetailsUrl(block: string): string | null {
	const match = block.match(/href=["']([^"']*driverResults\.aspx\/\d+[^"']*)["']/i);
	return match ? toAbsoluteNvidiaUrl(match[1]) : null;
}

function getLinkUrl(block: string, label: string): string | null {
	const link = [...block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)].find(
		(match) => htmlToText(match[2]).includes(label)
	);

	return link ? toAbsoluteNvidiaUrl(link[1]) : null;
}

function toAbsoluteNvidiaUrl(url: string): string {
	const decoded = decodeHtmlEntities(url);
	if (decoded.startsWith('http')) return decoded;
	if (decoded.startsWith('//')) return `https:${decoded}`;
	if (decoded.startsWith('/')) return `${nvidiaBaseUrl}${decoded}`;
	return `${nvidiaBaseUrl}/${decoded}`;
}

function getReleaseContentText(text: string): string {
	return text
		.replace(/^.*?Release Highlights:\s*/s, '')
		.replace(/Learn more in our Game Ready Driver article here\..*$/s, '')
		.replace(/Game Ready Driver Release Notes.*$/s, '')
		.trim();
}

function renderReleaseHtml(
	text: string,
	releaseNotesUrl: string | null,
	downloadUrl: string | null
): string {
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	const html: string[] = [];
	let listOpen = false;

	for (const line of lines) {
		if (line.startsWith('* ')) {
			if (!listOpen) {
				html.push('<ul>');
				listOpen = true;
			}
			html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
			continue;
		}

		if (listOpen) {
			html.push('</ul>');
			listOpen = false;
		}

		if (isSectionHeading(line)) {
			html.push(`<h3>${escapeHtml(line)}</h3>`);
		} else {
			html.push(`<p>${escapeHtml(line)}</p>`);
		}
	}

	if (listOpen) {
		html.push('</ul>');
	}

	const links = [
		releaseNotesUrl ? `<li><a href="${escapeHtml(releaseNotesUrl)}">Release notes</a></li>` : null,
		downloadUrl ? `<li><a href="${escapeHtml(downloadUrl)}">Download driver</a></li>` : null
	].filter((link): link is string => link !== null);

	if (links.length > 0) {
		html.push('<h3>Links</h3>');
		html.push(`<ul>${links.join('')}</ul>`);
	}

	return html.join('\n');
}

function isSectionHeading(line: string): boolean {
	return [
		'Release Highlights:',
		'Game Ready',
		'Gaming Technology',
		'Fixed Gaming Bugs',
		'Fixed General Bugs',
		'Fixed Gaming and General Bugs',
		'Security Updates',
		"What's New"
	].includes(line);
}

function htmlToText(html: string): string {
	return decodeHtmlEntities(
		html
			.replace(/<li\b[^>]*>/gi, '\n* ')
			.replace(/<\/(?:p|div|h\d|li|tr)>/gi, '\n')
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<[^>]+>/g, ' ')
			.replace(/[ \t]+/g, ' ')
			.replace(/\n\s+/g, '\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	);
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

function normalizeNvidiaDate(value: string): string | null {
	const match = value.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
	if (!match) return null;

	const month = nvidiaMonths[match[1]];
	if (month === undefined) return null;

	return `${match[3]}-${String(month + 1).padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}

function getSummary(value: string): string {
	const text = value.replace(/\* /g, '').replace(/\s+/g, ' ').trim();

	if (text.length <= 220) return text;
	return `${text.slice(0, 217)}...`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
