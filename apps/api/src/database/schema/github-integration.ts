import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { channels } from './channels';
import { user } from './auth';
import { workspaces } from './workspaces';

export const githubInstallations = pgTable(
  'github_installations',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    installationId: bigint('installation_id', { mode: 'number' }).notNull(),
    accountLogin: text('account_login').notNull(),
    accountType: text('account_type').notNull(),
    installedByUserId: text('installed_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('github_installations_workspace_id_unq').on(table.workspaceId),
    uniqueIndex('github_installations_installation_id_unq').on(
      table.installationId,
    ),
    index('github_installations_installation_id_idx').on(table.installationId),
  ],
);

export const channelGithubRepos = pgTable(
  'channel_github_repos',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    installationId: bigint('installation_id', { mode: 'number' }).notNull(),
    owner: text('owner').notNull(),
    repo: text('repo').notNull(),
    connectedByUserId: text('connected_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('channel_github_repos_channel_id_unq').on(table.channelId),
    uniqueIndex('channel_github_repos_workspace_owner_repo_unq').on(
      table.workspaceId,
      table.owner,
      table.repo,
    ),
    index('channel_github_repos_owner_repo_idx').on(table.owner, table.repo),
  ],
);

export const githubPrLinks = pgTable(
  'github_pr_links',
  {
    id: text('id').primaryKey(),
    ticketChannelId: text('ticket_channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    owner: text('owner').notNull(),
    repo: text('repo').notNull(),
    prNumber: integer('pr_number').notNull(),
    headRef: text('head_ref').notNull(),
    htmlUrl: text('html_url').notNull(),
    state: text('state').notNull(),
    merged: boolean('merged').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('github_pr_links_ticket_pr_unq').on(
      table.ticketChannelId,
      table.owner,
      table.repo,
      table.prNumber,
    ),
  ],
);
