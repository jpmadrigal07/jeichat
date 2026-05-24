import { boolean, index, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const workspaceRoles = pgTable(
  'workspace_roles',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#99aab5'),
    permissions: text('permissions').notNull().default('[]'),
    isAdministrator: boolean('is_administrator').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false),
    position: integer('position').notNull().default(0),
  },
  (table) => [index('workspace_roles_workspace_id_idx').on(table.workspaceId)],
);
