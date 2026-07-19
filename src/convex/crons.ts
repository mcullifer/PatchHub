import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Run daily at 08:00 UTC, which is overnight in US Central time. The action
// pages from the stored cursor and reschedules itself until Steam reports no
// more results, so each run fully catches up.
crons.cron('sync steam catalog', '0 8 * * *', internal.steamSync.runScheduled, {});

export default crons;
