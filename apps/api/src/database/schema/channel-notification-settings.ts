import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { channels } from './channels';

/**
 * A user's notification preference for one channel. No row means the default
 * ("all"), so only "mentions" and "muted" are ever stored.
 */
export const channelNotificationSettings = pgTable(
  'channel_notification_settings',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    level: text('level').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.channelId] }),
    index('channel_notification_settings_channel_id_idx').on(table.channelId),
  ],
);
