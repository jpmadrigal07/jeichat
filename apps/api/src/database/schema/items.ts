import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Example application table for Drizzle wiring.
 * Better Auth tables live in `schema/auth.ts`.
 */
export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
