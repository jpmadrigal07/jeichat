import { readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

const migrations = [
  {
    name: '0017_message_reactions',
    table: 'message_reactions',
    file: '../src/database/drizzle/0017_message_reactions.sql',
  },
  {
    name: '0018_notification_reaction_emoji',
    column: { table: 'notifications', name: 'emoji' },
    file: '../src/database/drizzle/0018_notification_reaction_emoji.sql',
  },
  {
    name: '0019_dm_channels',
    column: { table: 'channels', name: 'channel_type' },
    file: '../src/database/drizzle/0019_dm_channels.sql',
  },
  {
    name: '0020_ticket_watchers',
    table: 'channel_watchers',
    file: '../src/database/drizzle/0020_ticket_watchers.sql',
  },
] as const;

try {
  for (const migration of migrations) {
    if ('table' in migration && migration.table) {
      const exists = await pool.query(
        'SELECT to_regclass($1) AS table_name',
        [`public.${migration.table}`],
      );
      if (exists.rows[0]?.table_name) {
        console.log(`${migration.name}: already applied (${migration.table} exists)`);
        continue;
      }
    }

    if ('column' in migration && migration.column) {
      const exists = await pool.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1
           AND column_name = $2`,
        [migration.column.table, migration.column.name],
      );
      if (exists.rowCount && exists.rowCount > 0) {
        console.log(`${migration.name}: already applied (${migration.column.name} column exists)`);
        continue;
      }
    }

    const sqlPath = path.join(__dirname, migration.file);
    const sql = readFileSync(sqlPath, 'utf8');
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
      console.log(`Applied ${migration.name} successfully.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
} catch (error) {
  console.error(
    'Failed to apply migrations:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
} finally {
  await pool.end();
}
