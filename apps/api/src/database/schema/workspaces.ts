import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
