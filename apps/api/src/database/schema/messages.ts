import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
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
  ],
);
