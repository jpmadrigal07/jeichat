import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { channels } from './channels';

export const labels = pgTable(
  'labels',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('labels_workspace_id_idx').on(table.workspaceId),
    uniqueIndex('labels_workspace_id_name_unq').on(
      table.workspaceId,
      table.name,
    ),
  ],
);

export const channelLabels = pgTable(
  'channel_labels',
  {
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    labelId: text('label_id')
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.labelId] }),
    index('channel_labels_label_id_idx').on(table.labelId),
  ],
);
