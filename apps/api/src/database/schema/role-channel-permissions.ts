import { pgTable, text, unique } from 'drizzle-orm/pg-core';
import { channels } from './channels';
import { workspaceRoles } from './workspace-roles';

export const roleChannelPermissions = pgTable(
  'role_channel_permissions',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => workspaceRoles.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    allowPermissions: text('allow_permissions').notNull().default('[]'),
    denyPermissions: text('deny_permissions').notNull().default('[]'),
  },
  (table) => [
    unique('role_channel_permissions_role_id_channel_id_unq').on(
      table.roleId,
      table.channelId,
    ),
  ],
);
