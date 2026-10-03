import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { channels } from './channels';
import { user } from './auth';

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => user.id),
    content: text('content').notNull(),
    // Set when the sender removes the link previews; later edits must not bring them back.
    linkPreviewsSuppressed: boolean('link_previews_suppressed')
      .notNull()
      .default(false),
    replyToId: text('reply_to_id').references(
      (): AnyPgColumn => messages.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('messages_channel_id_created_at_idx').on(
      table.channelId,
      table.createdAt,
    ),
    index('messages_reply_to_id_idx').on(table.replyToId),
  ],
);
