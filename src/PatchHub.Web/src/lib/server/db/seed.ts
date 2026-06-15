import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/better-sqlite3';

dotenv.config();
const db_url = process.env.DATABASE_URL;
if (!db_url) throw new Error('DATABASE_URL is not set');
const client = new Database(db_url);
const db = drizzle(client);
const seeds = await import('./seeds');

const targetFile = process.argv[2];
await seeds.externalItem(db, targetFile);
