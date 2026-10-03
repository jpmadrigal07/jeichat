import { index, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { channels } from './channels';

export const channelWatchers = pgTable(
  'channel_watchers',
  {
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.userId] }),
    index('channel_watchers_user_id_idx').on(table.userId),
  ],
);
