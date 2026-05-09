import dotenv from 'dotenv';

dotenv.config();

const { SteamAppIngestionService } = await import(
	'../src/lib/server/steam/SteamAppIngestionService'
);

const maxPages = parseNumberArg('--pages', 1);
const classifyLimit = parseNumberArg('--classify', 0);
const startCursor = parseNumberArg('--start-cursor');

const result = await SteamAppIngestionService.syncAppList({
	maxPages,
	classifyLimit,
	startCursor
});

console.log('Steam app sync complete');
console.log(`Batches fetched: ${result.batchesFetched}`);
console.log(`Apps imported: ${result.appsImported}`);
console.log(`Final cursor: ${result.finalCursor ?? 'none'}`);
console.log(`Have more results: ${result.haveMoreResults ? 'yes' : 'no'}`);

function parseNumberArg(name: string, fallback?: number): number | undefined {
	const value = process.argv.find((arg) => arg.startsWith(`${name}=`))?.split('=')[1];
	if (!value) return fallback;

	const parsed = parseInt(value);
	if (Number.isNaN(parsed)) throw new Error(`${name} must be a number`);
	return parsed;
}
