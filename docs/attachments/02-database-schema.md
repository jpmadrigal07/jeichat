# Step 2 — Database schema

Goal: add an `attachments` table that links files in R2 to a message, and run the migration.

## 2.1 Schema design

One row per uploaded file. Attachments are created in two phases:

1. **Pending** — created when the client requests a presigned URL. Has a key but no message yet.
2. **Finalized** — promoted to a real attachment when the user actually sends the message; the row is updated with the `messageId`.

This makes orphan cleanup straightforward: any `pending` row older than ~1 hour with no message can be deleted (and the R2 object purged).

### File: `apps/api/src/database/schema/attachments.ts`

```typescript
import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { channels } from './channels';
import { messages } from './messages';
import { user } from './auth';
import { workspaces } from './workspaces';

export const attachments = pgTable(
  'attachments',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    messageId: text('message_id').references(() => messages.id, {
      onDelete: 'cascade',
    }),
    uploaderId: text('uploader_id')
      .notNull()
      .references(() => user.id),
    storageKey: text('storage_key').notNull().unique(), // e.g. workspaceId/channelId/uuid.jpg
    filename: text('filename').notNull(),               // original name, for display only
    contentType: text('content_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('pending'), // 'pending' | 'uploaded'
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('attachments_message_id_idx').on(table.messageId),
    index('attachments_pending_cleanup_idx').on(table.status, table.createdAt),
  ],
);
```

Notes:

- `messageId` is nullable to support the two-phase flow. Once a message is sent, it is populated and the row is updated to `status='uploaded'` after a HEAD check confirms the R2 object exists.
- `storageKey` is `unique` so a duplicate insert is impossible.
- `workspaceId` is denormalized onto the row so cleanup jobs and download permission checks don't need a channel join.
- No `updatedAt`: attachments are immutable once finalized.

## 2.2 Re-export from schema index

Update `apps/api/src/database/schema/index.ts`:

```typescript
export * from './attachments';
```

## 2.3 Generate and apply the migration

From `apps/api/`:

```bash
bun run db:generate
bun run db:migrate
```

Inspect the generated SQL in `apps/api/src/database/drizzle/` — verify foreign keys and indexes look right before committing.

## 2.4 Cleanup job (deferred to step 6)

The cleanup logic (delete pending rows + R2 objects older than X) is detailed in `06-permissions-security.md`. The schema is shaped to support it from day one.

Once the migration is applied locally, move to [03-backend-upload-api.md](03-backend-upload-api.md).
