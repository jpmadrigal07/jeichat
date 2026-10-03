import { pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { channels } from './channels';
import { user } from './auth';

export const channelReads = pgTable(
  'channel_reads',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.channelId] })],
);
