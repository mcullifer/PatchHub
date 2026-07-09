import { ConvexHttpClient } from 'convex/browser';
import dotenv from 'dotenv';
import { api } from '../src/convex/_generated/api';

dotenv.config();
dotenv.config({ path: '.env.local' });

const convexUrl = process.env.PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error('PUBLIC_CONVEX_URL is not set');

const secret = process.env.CONVEX_SERVER_SECRET;
if (!secret) throw new Error('CONVEX_SERVER_SECRET is not set');

const maxPages = parseNumberArg('--pages');
const delayMs = parseNumberArg('--delay-ms', 0);
const startCursor = parseNumberArg('--start-cursor');
const batchSize = parseNumberArg('--batch-size');

// Convex actions are time-limited, so sync a few pages per action call and
// keep calling until the catalog is exhausted (or --pages is reached).
const PAGES_PER_ACTION = 2;

const convex = new ConvexHttpClient(convexUrl);

let batchesFetched = 0;
let appsImported = 0;
let finalCursor: number | null = startCursor ?? null;
let haveMoreResults = true;
let firstCall = true;

while (haveMoreResults && (maxPages === undefined || batchesFetched < maxPages)) {
	const pagesThisCall =
		maxPages === undefined
			? PAGES_PER_ACTION
			: Math.min(PAGES_PER_ACTION, maxPages - batchesFetched);

	const result = await convex.action(api.steamSync.runManual, {
		secret,
		maxPages: pagesThisCall,
		delayMs,
		batchSize,
		startCursor: firstCall ? startCursor : undefined
	});
	firstCall = false;

	batchesFetched += result.batchesFetched;
	appsImported += result.appsImported;
	finalCursor = result.finalCursor;
	haveMoreResults = result.haveMoreResults;

	console.log(
		`Progress: ${batchesFetched} batches, ${appsImported} apps imported, cursor ${finalCursor ?? 'none'}`
	);

	if (result.batchesFetched === 0) break;
	if (haveMoreResults && delayMs > 0) {
		await new Promise((resolve) => setTimeout(resolve, delayMs));
	}
}

console.log('Steam catalog sync complete');
console.log(`Batches fetched: ${batchesFetched}`);
console.log(`Apps imported: ${appsImported}`);
console.log(`Final cursor: ${finalCursor ?? 'none'}`);
console.log(`Have more results: ${haveMoreResults ? 'yes' : 'no'}`);

function parseNumberArg(name: string, fallback?: number): number | undefined {
	const inlineValue = process.argv.find((arg) => arg.startsWith(`${name}=`))?.split('=')[1];
	const flagIndex = process.argv.indexOf(name);
	const spacedValue =
		flagIndex >= 0 && flagIndex + 1 < process.argv.length ? process.argv[flagIndex + 1] : undefined;
	const value = inlineValue ?? spacedValue;
	if (!value) return fallback;

	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) throw new Error(`${name} must be a number`);
	return parsed;
}
