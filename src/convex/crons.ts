import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Run daily at 08:00 UTC, which is overnight in US Central time. Keep the
// scheduled run small; the manual script can run larger catch-up batches.
crons.cron('sync steam catalog', '0 8 * * *', internal.steamSync.runScheduled, {
	maxPages: 2
});

export default crons;
