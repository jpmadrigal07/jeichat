import { bigint, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { channels } from './channels';
import { messages } from './messages';
import { user } from './auth';
import { workspaces } from './workspaces';

export const attachments = pgTable(
  'attachments',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    messageId: text('message_id').references(() => messages.id, {
      onDelete: 'cascade',
    }),
    uploaderId: text('uploader_id')
      .notNull()
      .references(() => user.id),
    storageKey: text('storage_key').notNull().unique(),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('pending'),
    purpose: text('purpose').notNull().default('message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('attachments_message_id_idx').on(table.messageId),
    index('attachments_pending_cleanup_idx').on(table.status, table.createdAt),
  ],
);
