import path from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const WORKSPACE_ID = 'edfd8af3-d38f-4c34-9385-44e8b9bb0998';
const PREFERRED_CHANNEL_ID = 'fada21bb-2623-4f1f-a31b-219b7b03e292';
const COUNT = Number(process.env.SEED_MESSAGE_COUNT ?? 250);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

async function main() {
  const channels = await pool.query<{
    id: string;
    name: string;
    parent_id: string | null;
    channel_type: string;
  }>(
    `select id, name, parent_id, channel_type
     from channels
     where workspace_id = $1
     order by parent_id nulls first, name`,
    [WORKSPACE_ID],
  );

  const channel =
    channels.rows.find((row) => row.id === PREFERRED_CHANNEL_ID) ??
    channels.rows.find((row) => !row.parent_id && row.channel_type === 'channel');

  if (!channel) {
    throw new Error('No channel found in the current workspace');
  }

  const users = await pool.query<{ id: string; name: string; email: string }>(
    `select u.id, u.name, u.email
     from "user" u
     join workspace_members wm on wm.user_id = u.id
     where wm.workspace_id = $1`,
    [WORKSPACE_ID],
  );

  if (users.rows.length === 0) {
    throw new Error('No workspace members found');
  }

  const now = Date.now();
  const values: unknown[] = [];
  const placeholders: string[] = [];

  for (let i = 0; i < COUNT; i += 1) {
    const createdAt = new Date(now - (COUNT - i) * 60_000);
    const sender = users.rows[i % users.rows.length];
    const base = placeholders.length * 5;
    placeholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 5})`,
    );
    values.push(
      randomUUID(),
      channel.id,
      sender.id,
      `Seed message ${i + 1} of ${COUNT}`,
      createdAt.toISOString(),
    );
  }

  await pool.query(
    `insert into messages (id, channel_id, sender_id, content, created_at, updated_at)
     values ${placeholders.join(', ')}`,
    values,
  );

  const total = await pool.query<{ n: string }>(
    'select count(*)::int as n from messages where channel_id = $1',
    [channel.id],
  );

  console.log(
    JSON.stringify(
      {
        channel: { id: channel.id, name: channel.name },
        inserted: COUNT,
        totalInChannel: total.rows[0]?.n,
        senders: users.rows.map((user) => user.name),
        sampleSearch: 'Seed message 10',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
