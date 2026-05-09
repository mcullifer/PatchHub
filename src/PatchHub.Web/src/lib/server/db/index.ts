import { env } from '$env/dynamic/private';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const databaseUrl = env.DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const client = new Database(databaseUrl);
export const db = drizzle(client, {
	schema: schema
});
