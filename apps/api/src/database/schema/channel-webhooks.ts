import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { channels } from './channels';
import { workspaces } from './workspaces';

/**
 * Incoming webhooks: anyone holding the secret URL can post into one channel.
 * Each webhook owns a synthetic `user` row (never a workspace member) that its
 * messages are sent as. Deleting a webhook only stamps `deletedAt` so earlier
 * messages keep their sender and webhook badge.
 */
export const channelWebhooks = pgTable(
  'channel_webhooks',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    /** SHA-256 of the secret; the plaintext is only ever shown once. Null once deleted. */
    tokenHash: text('token_hash'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('channel_webhooks_user_id_unq').on(table.userId),
    index('channel_webhooks_channel_id_idx')
      .on(table.channelId)
      .where(sql`${table.deletedAt} is null`),
  ],
);
