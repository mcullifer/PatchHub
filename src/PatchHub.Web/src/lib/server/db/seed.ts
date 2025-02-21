import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as seeds from './seeds';

dotenv.config();
const db_url = process.env.DATABASE_URL;
if (!db_url) throw new Error('DATABASE_URL is not set');
const client = new Database(db_url);
const db = drizzle(client);

await seeds.game(db);
