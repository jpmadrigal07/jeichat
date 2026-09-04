import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { channels } from './channels';

export const channelMembers = pgTable(
  'channel_members',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    addedBy: text('added_by')
      .notNull()
      .references(() => user.id),
    addedAt: timestamp('added_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('channel_members_channel_id_user_id_unq').on(
      table.channelId,
      table.userId,
    ),
    index('channel_members_channel_id_idx').on(table.channelId),
    index('channel_members_user_id_idx').on(table.userId),
  ],
);
