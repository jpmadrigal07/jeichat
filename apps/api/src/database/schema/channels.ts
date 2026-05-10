import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const channels = pgTable(
  'channels',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('channels_workspace_id_idx').on(table.workspaceId),
    unique('channels_workspace_id_name_unq').on(table.workspaceId, table.name),
  ],
);
