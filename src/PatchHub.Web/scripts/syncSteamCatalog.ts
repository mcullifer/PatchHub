import dotenv from 'dotenv';

dotenv.config();

const { syncSteamCatalog } = await import('../src/lib/server/steam/SteamCatalogSync');

const maxPages = parseNumberArg('--pages');
const delayMs = parseNumberArg('--delay-ms', 0);
const startCursor = parseNumberArg('--start-cursor');
const batchSize = parseNumberArg('--batch-size', 50);

const result = await syncSteamCatalog({
	maxPages,
	delayMs,
	startCursor,
	batchSize
});

console.log('Steam catalog sync complete');
console.log(`Batches fetched: ${result.batchesFetched}`);
console.log(`Apps imported: ${result.appsImported}`);
console.log(`Final cursor: ${result.finalCursor ?? 'none'}`);
console.log(`Have more results: ${result.haveMoreResults ? 'yes' : 'no'}`);

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
