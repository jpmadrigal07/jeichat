import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { channels } from './channels';
import { messages } from './messages';

export const pinnedMessages = pgTable(
  'pinned_messages',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    pinnedBy: text('pinned_by')
      .notNull()
      .references(() => user.id),
    pinnedAt: timestamp('pinned_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('pinned_messages_channel_id_message_id_unq').on(
      table.channelId,
      table.messageId,
    ),
    index('pinned_messages_channel_id_pinned_at_idx').on(
      table.channelId,
      table.pinnedAt,
    ),
  ],
);
