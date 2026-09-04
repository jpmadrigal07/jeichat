import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { workspaces } from './workspaces';

export const channels = pgTable(
  'channels',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status'),
    priority: text('priority'),
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    ticketNumber: integer('ticket_number'),
    ticketKey: text('ticket_key'),
    isPrivate: boolean('is_private').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('channels_workspace_id_idx').on(table.workspaceId),
    index('channels_parent_id_idx').on(table.parentId),
    uniqueIndex('channels_workspace_id_name_unq')
      .on(table.workspaceId, table.name)
      .where(sql`${table.parentId} is null`),
    uniqueIndex('channels_parent_id_name_unq')
      .on(table.parentId, table.name)
      .where(sql`${table.parentId} is not null`),
    uniqueIndex('channels_parent_ticket_number_unq')
      .on(table.parentId, table.ticketNumber)
      .where(sql`${table.parentId} is not null`),
    uniqueIndex('channels_workspace_ticket_key_unq')
      .on(table.workspaceId, table.ticketKey)
      .where(sql`${table.parentId} is null and ${table.ticketKey} is not null`),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'channels_parent_id_fk',
    }).onDelete('cascade'),
  ],
);
