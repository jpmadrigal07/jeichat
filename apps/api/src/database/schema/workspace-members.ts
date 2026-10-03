import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { user } from './auth';

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('workspace_members_workspace_id_user_id_unq').on(
      table.workspaceId,
      table.userId,
    ),
  ],
);
