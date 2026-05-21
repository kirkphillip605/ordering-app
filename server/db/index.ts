import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing. Please configure it in your .env file.');
}

console.log('Connecting to PostgreSQL database...');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client from pool:', err.stack);
  } else {
    console.log('Successfully connected to PostgreSQL database.');
    release();
  }
});

export const db = drizzle(pool, { schema });
