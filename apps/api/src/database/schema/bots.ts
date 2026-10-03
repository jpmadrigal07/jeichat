import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { workspaces } from './workspaces';

export const bots = pgTable(
  'bots',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    tokenHash: text('token_hash').notNull(),
    tokenPrefix: text('token_prefix').notNull(),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('bots_user_id_unq').on(table.userId),
    unique('bots_token_hash_unq').on(table.tokenHash),
    index('bots_workspace_id_idx').on(table.workspaceId),
  ],
);
