import { pgTable, text, unique } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { workspaceRoles } from './workspace-roles';

export const workspaceRoleMembers = pgTable(
  'workspace_role_members',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => workspaceRoles.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('workspace_role_members_role_id_user_id_unq').on(
      table.roleId,
      table.userId,
    ),
  ],
);
