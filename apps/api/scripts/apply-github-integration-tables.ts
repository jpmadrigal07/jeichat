import { readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

const MARKER_TABLE = 'channel_github_repos';
const SQL_FILE = path.join(
  __dirname,
  '../src/database/drizzle/0027_github_integration.sql',
);

try {
  const exists = await pool.query('SELECT to_regclass($1) AS table_name', [
    `public.${MARKER_TABLE}`,
  ]);
  if (exists.rows[0]?.table_name) {
    console.log('GitHub integration tables already exist.');
    process.exit(0);
  }

  const sql = readFileSync(SQL_FILE, 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((part) => part.trim())
    .filter(Boolean);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query('COMMIT');
    console.log('Applied GitHub integration tables (0027).');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error(
    'Failed to apply GitHub integration tables:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
} finally {
  await pool.end();
}
