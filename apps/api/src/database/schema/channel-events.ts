import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { channels } from './channels';

export const channelEvents = pgTable(
  'channel_events',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id),
    type: text('type').notNull(),
    fromValue: jsonb('from_value'),
    toValue: jsonb('to_value'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('channel_events_channel_id_created_at_idx').on(
      table.channelId,
      table.createdAt,
    ),
  ],
);
