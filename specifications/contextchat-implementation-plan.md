# ContextChat — Implementation Plan

> Step-by-step, module-by-module plan for building ContextChat on top of the existing JeiChat codebase.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Phase 1 — Database Schema & Migrations](#phase-1--database-schema--migrations)
4. [Phase 2 — Backend: Workspace Module](#phase-2--backend-workspace-module)
5. [Phase 3 — Backend: Channel Module](#phase-3--backend-channel-module)
6. [Phase 4 — Backend: Message Module](#phase-4--backend-message-module)
7. [Phase 5 — Backend: WebSocket Gateway](#phase-5--backend-websocket-gateway)
8. [Phase 6 — Backend: Export Module](#phase-6--backend-export-module)
9. [Phase 7 — Frontend: Layout & Navigation](#phase-7--frontend-layout--navigation)
10. [Phase 8 — Frontend: Workspace Management UI](#phase-8--frontend-workspace-management-ui)
11. [Phase 9 — Frontend: Channel Management UI](#phase-9--frontend-channel-management-ui)
12. [Phase 10 — Frontend: Messaging UI](#phase-10--frontend-messaging-ui)
13. [Phase 11 — Frontend: Export UI](#phase-11--frontend-export-ui)
14. [Dependency Graph](#dependency-graph)
15. [Verification Plan](#verification-plan)

---

## Overview

### What exists today

JeiChat is a Turborepo monorepo with:

- **Backend** (`apps/api`): NestJS 11 with Better Auth (email/password), Drizzle ORM + PostgreSQL, session management, CORS. Currently has a root controller with demo endpoints (`/`, `/sample`, `/demo/slow`) and an auth controller (`/auth/me`).
- **Frontend** (`apps/web`): Next.js 16 with App Router, React 19, TanStack Query + Axios, shadcn/ui (radix-mira), react-hot-toast. Currently has a single home page with auth panel and demo cards.
- **Database**: PostgreSQL (Neon) via Drizzle ORM with three tables: `user`, `account`, `verification` (all Better Auth). Plus an example `items` table.
- **No real-time infrastructure**: No WebSocket, Socket.IO, or SSE.
- **No domain features**: Everything is demo/scaffold code.

### What we're building

Four core features from the ContextChat spec:

1. **Workspaces** — independent team/project containers with name + icon
2. **Text Channels** — named channels within workspaces with optional descriptions
3. **Real-Time Messaging** — send/receive messages live, persisted history
4. **Markdown Export** — export any channel as clean, AI-ready markdown

### New dependencies required

**Backend (`apps/api`):**
```bash
bun add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

**Frontend (`apps/web`):**
```bash
bun add socket.io-client @tanstack/react-virtual
```

**shadcn/ui components to add (`apps/web`):**
```bash
bunx shadcn@latest add sidebar tooltip scroll-area separator avatar dropdown-menu dialog input label textarea badge skeleton popover calendar tabs
```

---

## Architecture Decisions

### 1. Primary keys — text UUIDs

All new tables use `text` primary keys with `crypto.randomUUID()`, matching the existing Better Auth `user` table pattern. This keeps ID types consistent across the entire database.

### 2. Real-time — Socket.IO via NestJS WebSocket Gateway

NestJS has first-class WebSocket support via `@nestjs/websockets`. We'll use Socket.IO (not raw WebSocket) because:
- Built-in rooms (maps cleanly to channels)
- Automatic reconnection on the client
- Namespace support for future expansion
- `@nestjs/platform-socket.io` is the official NestJS adapter

### 3. WebSocket authentication — cookie-based

Socket.IO handshake includes cookies. We extract the session cookie from `client.handshake.headers.cookie` and validate it using Better Auth's `auth.api.getSession()`. This reuses the existing auth infrastructure with zero duplication.

### 4. Message pagination — cursor-based

Offset pagination breaks when new messages arrive (rows shift). Cursor-based pagination using `(created_at, id)` is stable under concurrent writes and maps naturally to "load older messages on scroll up".

### 5. REST + WebSocket bridge — direct injection (V1)

The `ChatGateway` is injected directly into `MessagesService`. When a message is created/edited/deleted via REST, the service calls `gateway.emitToChannel(...)`. This is simple and sufficient for V1. EventEmitter2 decoupling is a V2 optimization.

### 6. Frontend routing — route group with nested dynamic segments

```
/(chat)/w/[workspaceId]/c/[channelId]
```

The `(chat)` route group provides a shared layout (three-panel Discord-like UI) with auth gating at the layout level. Workspace and channel IDs are URL params, making the state bookmarkable and shareable.

### 7. Frontend layout — three-panel Discord-like

```
┌──────┬──────────────┬──────────────────────────────┐
│ W/S  │  Channel     │  Channel Header              │
│ icons│  sidebar     │──────────────────────────────│
│      │  - #general  │                              │
│      │  - #decisions│  Message List                │
│      │  - #research │  (virtual scroll)            │
│      │              │                              │
│      │              │──────────────────────────────│
│  +   │  + channel   │  Message Input               │
└──────┴──────────────┴──────────────────────────────┘
```

### 8. Socket client — singleton with HMR guard

A single Socket.IO client instance in `apps/web/lib/socket.ts` with lazy connection and a guard against HMR duplication in development. The socket connects when the user enters the chat layout and disconnects on unmount.

---

## Phase 1 — Database Schema & Migrations

### Goal
Create four new database tables that form the data foundation for all features.

### Files to create

#### 1.1 `apps/api/src/database/schema/workspaces.ts`

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

**Columns:**
| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `id` | text | PK | `crypto.randomUUID()` at insert time |
| `name` | text | NOT NULL | Workspace display name |
| `icon` | text | nullable | Emoji string or image URL |
| `owner_id` | text | NOT NULL, FK → user.id | Cascade delete if user is removed |
| `created_at` | timestamptz | NOT NULL, default now | |
| `updated_at` | timestamptz | NOT NULL, default now | |

#### 1.2 `apps/api/src/database/schema/workspace-members.ts`

```typescript
import { pgTable, text, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { workspaces } from './workspaces';

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
    role: text('role').notNull(), // 'owner' | 'member'
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('workspace_members_workspace_user_unq').on(table.workspaceId, table.userId),
    index('workspace_members_user_id_idx').on(table.userId),
    index('workspace_members_workspace_id_idx').on(table.workspaceId),
  ],
);
```

**Columns:**
| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `id` | text | PK | |
| `workspace_id` | text | NOT NULL, FK → workspaces.id | Cascade on workspace delete |
| `user_id` | text | NOT NULL, FK → user.id | Cascade on user delete |
| `role` | text | NOT NULL | `'owner'` or `'member'` |
| `joined_at` | timestamptz | NOT NULL, default now | |

**Constraints:**
- Unique on `(workspace_id, user_id)` — a user can only be a member once
- Index on `user_id` — fast lookup for "list my workspaces"
- Index on `workspace_id` — fast lookup for "list workspace members"

#### 1.3 `apps/api/src/database/schema/channels.ts`

```typescript
import { pgTable, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
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
```

**Columns:**
| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `id` | text | PK | |
| `workspace_id` | text | NOT NULL, FK → workspaces.id | Cascade delete |
| `name` | text | NOT NULL | Channel name without `#` prefix |
| `description` | text | nullable | Optional purpose description |
| `created_at` | timestamptz | NOT NULL, default now | |
| `updated_at` | timestamptz | NOT NULL, default now | |

**Constraints:**
- Index on `workspace_id` — list channels in a workspace
- Unique on `(workspace_id, name)` — no duplicate channel names within a workspace

#### 1.4 `apps/api/src/database/schema/messages.ts`

```typescript
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { channels } from './channels';

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('messages_channel_created_idx').on(table.channelId, table.createdAt),
    index('messages_sender_id_idx').on(table.senderId),
  ],
);
```

**Columns:**
| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `id` | text | PK | |
| `channel_id` | text | NOT NULL, FK → channels.id | Cascade delete |
| `sender_id` | text | NOT NULL, FK → user.id | Cascade delete |
| `content` | text | NOT NULL | Message text content |
| `created_at` | timestamptz | NOT NULL, default now | |
| `updated_at` | timestamptz | NOT NULL, default now | Updated on edit |

**Constraints:**
- Composite index on `(channel_id, created_at)` — critical for cursor-based pagination
- Index on `sender_id` — look up messages by user

### Files to modify

#### 1.5 `apps/api/src/database/schema/index.ts`

Add re-exports for the four new schema files:

```typescript
export * from './auth';
export * from './items';
export * from './workspaces';
export * from './workspace-members';
export * from './channels';
export * from './messages';
```

### Commands to run

```bash
cd apps/api
bun run db:generate    # Generate Drizzle migration SQL from schema diff
bun run db:migrate     # Apply migration to database
```

### Verification
- Open Drizzle Studio (`bun run db:studio`) and confirm all four tables exist
- Check that foreign keys and indices are created correctly
- Verify cascade deletes work (insert a workspace, delete it, confirm channels/members are gone)

---

## Phase 2 — Backend: Workspace Module

### Goal
Full CRUD for workspaces plus member management. Creating a workspace automatically creates a `#general` channel and adds the creator as the owner member.

### Files to create

#### 2.1 `apps/api/src/workspaces/workspaces.module.ts`

Standard NestJS module registering the controller and service. Exports the service so other modules (channels, messages) can verify workspace membership.

```
@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
```

#### 2.2 `apps/api/src/workspaces/workspaces.service.ts`

Injects `DrizzleService`. Methods:

| Method | Description |
|--------|-------------|
| `create(userId, dto)` | Insert workspace + insert workspace_member (role: owner) + insert #general channel. All in a transaction. |
| `findAllForUser(userId)` | Join `workspace_members` → `workspaces` where `user_id = userId`. Returns list of workspaces the user belongs to. |
| `findOne(workspaceId)` | Select workspace by ID. Throws `NotFoundException` if not found. |
| `update(workspaceId, userId, dto)` | Verify user is owner, update name/icon. Throws `ForbiddenException` if not owner. |
| `remove(workspaceId, userId)` | Verify user is owner, delete workspace (cascades channels, messages, members). |
| `addMember(workspaceId, userId, targetEmail)` | Look up user by email, insert into workspace_members with role 'member'. Throws if already a member. |
| `removeMember(workspaceId, userId, targetUserId)` | Verify requester is owner, delete from workspace_members. Cannot remove the owner. |
| `verifyMembership(workspaceId, userId)` | Check if user is a member. Returns the membership record or throws `ForbiddenException`. Used by channels/messages modules. |

**DTOs (inline or separate file):**
- `CreateWorkspaceDto`: `{ name: string; icon?: string }`
- `UpdateWorkspaceDto`: `{ name?: string; icon?: string }`
- `AddMemberDto`: `{ email: string }`

#### 2.3 `apps/api/src/workspaces/workspaces.controller.ts`

All endpoints require `@Session()`. The controller delegates everything to the service.

| Method | Path | Description |
|--------|------|-------------|
| `POST /workspaces` | Create workspace | Extract `session.user.id`, call `service.create()` |
| `GET /workspaces` | List my workspaces | Call `service.findAllForUser(userId)` |
| `GET /workspaces/:id` | Get workspace | Verify membership, return workspace |
| `PATCH /workspaces/:id` | Update workspace | Call `service.update()` (owner check inside) |
| `DELETE /workspaces/:id` | Delete workspace | Call `service.remove()` (owner check inside) |
| `POST /workspaces/:id/members` | Add member | Call `service.addMember()` |
| `DELETE /workspaces/:id/members/:userId` | Remove member | Call `service.removeMember()` |

### Files to modify

#### 2.4 `apps/api/src/app.module.ts`

Add `WorkspacesModule` to the `imports` array.

### Verification
```bash
# Create workspace (requires valid session cookie)
curl -X POST http://localhost:3001/workspaces \
  -H "Content-Type: application/json" \
  -b "cookie-from-sign-in" \
  -d '{"name": "Engineering", "icon": "🚀"}'

# List workspaces
curl http://localhost:3001/workspaces -b "cookie"

# Verify #general channel was auto-created
# (requires Phase 3 endpoint, or check via db:studio)
```

---

## Phase 3 — Backend: Channel Module

### Goal
CRUD for channels scoped to a workspace. All operations verify the requesting user is a workspace member.

### Files to create

#### 3.1 `apps/api/src/channels/channels.module.ts`

Imports `WorkspacesModule` (to use `WorkspacesService.verifyMembership`).

```
@Module({
  imports: [WorkspacesModule],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
```

#### 3.2 `apps/api/src/channels/channels.service.ts`

Injects `DrizzleService` and `WorkspacesService`. Methods:

| Method | Description |
|--------|-------------|
| `create(workspaceId, userId, dto)` | Verify membership, insert channel. Throws if name is duplicate in workspace. |
| `findAllInWorkspace(workspaceId, userId)` | Verify membership, select all channels where `workspace_id = workspaceId`, ordered by `created_at`. |
| `findOne(channelId)` | Select channel by ID. Throws `NotFoundException`. |
| `findOneWithWorkspace(channelId)` | Select channel joined with workspace (needed by export for workspace name). |
| `update(channelId, userId, dto)` | Verify membership in channel's workspace, update name/description. |
| `remove(channelId, userId)` | Verify membership. Count channels in workspace — prevent deleting the last one. Delete channel (cascades messages). |

**DTOs:**
- `CreateChannelDto`: `{ name: string; description?: string }`
- `UpdateChannelDto`: `{ name?: string; description?: string }`

#### 3.3 `apps/api/src/channels/channels.controller.ts`

| Method | Path | Description |
|--------|------|-------------|
| `POST /workspaces/:workspaceId/channels` | Create channel | |
| `GET /workspaces/:workspaceId/channels` | List channels | |
| `GET /workspaces/:workspaceId/channels/:id` | Get channel | |
| `PATCH /workspaces/:workspaceId/channels/:id` | Update channel | |
| `DELETE /workspaces/:workspaceId/channels/:id` | Delete channel | |

### Files to modify

#### 3.4 `apps/api/src/app.module.ts`

Add `ChannelsModule` to imports.

### Verification
```bash
# Create channel
curl -X POST http://localhost:3001/workspaces/{id}/channels \
  -H "Content-Type: application/json" -b "cookie" \
  -d '{"name": "decisions", "description": "Architecture decisions log"}'

# List channels
curl http://localhost:3001/workspaces/{id}/channels -b "cookie"

# Verify unique name constraint
# (creating another "decisions" channel should fail)
```

---

## Phase 4 — Backend: Message Module

### Goal
Send, list (with cursor pagination), edit, and delete messages. All operations verify workspace membership through the channel's workspace.

### Files to create

#### 4.1 `apps/api/src/messages/messages.module.ts`

Imports `WorkspacesModule` and `ChannelsModule`.

#### 4.2 `apps/api/src/messages/messages.service.ts`

Injects `DrizzleService`, `WorkspacesService`, `ChannelsService`. Methods:

| Method | Description |
|--------|-------------|
| `create(channelId, userId, dto)` | Look up channel → verify workspace membership → insert message → return message with sender info. |
| `findByChannel(channelId, userId, cursor?, limit?)` | Verify membership. Select messages joined with `user` (for sender name). Cursor-based: if cursor provided, filter `WHERE (created_at, id) < (cursorDate, cursorId)`. Order by `created_at DESC, id DESC`. Return `{ data, nextCursor }`. |
| `update(messageId, userId, dto)` | Find message, verify sender matches userId, update content + `updated_at`. |
| `remove(messageId, userId)` | Find message, verify sender matches userId, delete. |
| `findByChannelForExport(channelId, from?, to?)` | Select all messages in date range, joined with user, ordered by `created_at ASC`. No pagination — full dump for export. |

**Pagination details:**
- Default limit: 50
- Cursor format: `<ISO timestamp>_<message id>` (e.g., `2026-05-10T09:15:00.000Z_abc123`)
- Parse cursor: split on first `_`, extract timestamp and id
- Query: `WHERE channel_id = ? AND (created_at, id) < (?, ?)` using `sql` template from drizzle-orm
- `nextCursor`: if results.length === limit, build cursor from last row; otherwise `null`

**Response shape:**
```typescript
{
  data: Array<{
    id: string;
    channelId: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    sender: {
      id: string;
      name: string;
      image: string | null;
    };
  }>;
  nextCursor: string | null;
}
```

#### 4.3 `apps/api/src/messages/messages.controller.ts`

| Method | Path | Description |
|--------|------|-------------|
| `POST /channels/:channelId/messages` | Send message | Body: `{ content: string }` |
| `GET /channels/:channelId/messages` | List messages | Query: `?cursor=...&limit=50` |
| `PATCH /channels/:channelId/messages/:id` | Edit message | Body: `{ content: string }` |
| `DELETE /channels/:channelId/messages/:id` | Delete message | |

### Files to modify

#### 4.4 `apps/api/src/app.module.ts`

Add `MessagesModule` to imports.

### Verification
```bash
# Send message
curl -X POST http://localhost:3001/channels/{channelId}/messages \
  -H "Content-Type: application/json" -b "cookie" \
  -d '{"content": "Hello from the API!"}'

# List messages (first page)
curl "http://localhost:3001/channels/{channelId}/messages?limit=10" -b "cookie"

# List messages (next page using cursor from previous response)
curl "http://localhost:3001/channels/{channelId}/messages?limit=10&cursor=2026-05-10T09:00:00Z_msg123" -b "cookie"

# Edit message (must be sender)
curl -X PATCH http://localhost:3001/channels/{channelId}/messages/{msgId} \
  -H "Content-Type: application/json" -b "cookie" \
  -d '{"content": "Updated message"}'
```

---

## Phase 5 — Backend: WebSocket Gateway

### Goal
Real-time messaging via Socket.IO. Clients join channel rooms and receive live message events. Auth is validated on connection using the session cookie.

### Dependencies
```bash
cd apps/api && bun add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### Files to create

#### 5.1 `apps/api/src/gateway/gateway.module.ts`

```
@Module({
  providers: [ChatGateway],
  exports: [ChatGateway],
})
```

#### 5.2 `apps/api/src/gateway/chat.gateway.ts`

Decorated with `@WebSocketGateway()`. Configuration:

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.WEB_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
```

**Lifecycle:**

```
Client connects
  → handleConnection(client):
    1. Extract cookie from client.handshake.headers.cookie
    2. Create a Headers object with the cookie
    3. Call auth.api.getSession({ headers })
    4. If no session → client.disconnect()
    5. If valid → store userId and userName on client.data
```

**Event handlers:**

| Decorator | Event | Handler | Logic |
|-----------|-------|---------|-------|
| `@SubscribeMessage('join_channel')` | join_channel | `handleJoinChannel(client, { channelId })` | Verify workspace membership for this channel. Call `client.join(channelId)`. |
| `@SubscribeMessage('leave_channel')` | leave_channel | `handleLeaveChannel(client, { channelId })` | Call `client.leave(channelId)`. |
| `@SubscribeMessage('typing')` | typing | `handleTyping(client, { channelId })` | Broadcast `user_typing` to room `channelId` (exclude sender). |

**Public methods (called by MessagesService):**

| Method | Description |
|--------|-------------|
| `emitNewMessage(channelId, message)` | `this.server.to(channelId).emit('new_message', message)` |
| `emitMessageUpdated(channelId, message)` | `this.server.to(channelId).emit('message_updated', message)` |
| `emitMessageDeleted(channelId, messageId)` | `this.server.to(channelId).emit('message_deleted', { id: messageId, channelId })` |

### Files to modify

#### 5.3 `apps/api/src/app.module.ts`

Add `GatewayModule` to imports.

#### 5.4 `apps/api/src/messages/messages.module.ts`

Import `GatewayModule` so `MessagesService` can inject `ChatGateway`.

#### 5.5 `apps/api/src/messages/messages.service.ts`

After each mutation, call the gateway:
- `create()` → `this.chatGateway.emitNewMessage(channelId, messageWithSender)`
- `update()` → `this.chatGateway.emitMessageUpdated(channelId, updatedMessage)`
- `remove()` → `this.chatGateway.emitMessageDeleted(channelId, messageId)`

### WebSocket event reference

**Client → Server:**
```
join_channel    { channelId: string }
leave_channel   { channelId: string }
typing          { channelId: string }
```

**Server → Client:**
```
new_message     { id, channelId, content, createdAt, updatedAt, sender: { id, name, image } }
message_updated { id, channelId, content, createdAt, updatedAt, sender: { id, name, image } }
message_deleted { id: string, channelId: string }
user_typing     { channelId: string, userId: string, userName: string }
```

### Verification
- Connect with a Socket.IO test client, verify auth rejection without cookie
- Connect with valid cookie, join a channel, send a message via REST, verify `new_message` event is received
- Open two clients in the same channel, verify typing indicators

---

## Phase 6 — Backend: Export Module

### Goal
Generate clean markdown from a channel's message history, with optional date range filtering.

### Files to create

#### 6.1 `apps/api/src/export/export.module.ts`

Imports `ChannelsModule`, `MessagesModule`, `WorkspacesModule`.

#### 6.2 `apps/api/src/export/export.service.ts`

Injects `ChannelsService`, `MessagesService`, `WorkspacesService`. Single main method:

| Method | Description |
|--------|-------------|
| `exportChannelAsMarkdown(channelId, userId, from?, to?)` | 1. Get channel with workspace info. 2. Verify workspace membership. 3. Fetch all messages in date range via `MessagesService.findByChannelForExport()`. 4. Build markdown string. 5. Return `{ markdown, filename }`. |

**Markdown generation logic:**

```
1. Header:
   # {Workspace Name} / #{Channel Name}
   > {Channel description}  (if exists)
   **Exported:** {today's date}
   **Messages:** {count}
   **Date range:** {earliest} — {latest}  (or "All time" if no filter)
   ---

2. Group messages by date (YYYY-MM-DD)

3. For each date group:
   ### {date}
   
   **{Sender Name}** ({time HH:MM AM/PM}):
   {message content}
   
   (blank line between messages)
   ---
```

#### 6.3 `apps/api/src/export/export.controller.ts`

| Method | Path | Description |
|--------|------|-------------|
| `GET /channels/:channelId/export` | Export channel | Query: `?from=ISO&to=ISO` |

**Response behavior:**
- Set `Content-Type: text/markdown; charset=utf-8`
- Set `Content-Disposition: attachment; filename="{workspace}-{channel}-{date}.md"`
- Return the markdown string as the response body

### Files to modify

#### 6.4 `apps/api/src/app.module.ts`

Add `ExportModule` to imports.

### Verification
```bash
# Export full channel
curl "http://localhost:3001/channels/{channelId}/export" -b "cookie"

# Export with date range
curl "http://localhost:3001/channels/{channelId}/export?from=2026-05-01&to=2026-05-10" -b "cookie"

# Verify output is clean markdown, paste into AI tool
```

---

## Phase 7 — Frontend: Layout & Navigation

### Goal
Create the Discord-like three-panel chat layout, set up routing, and create the Socket.IO client singleton.

### Dependencies
```bash
cd apps/web && bun add socket.io-client @tanstack/react-virtual
```

### shadcn/ui components
```bash
cd apps/web && bunx shadcn@latest add sidebar tooltip scroll-area separator avatar dropdown-menu dialog input label textarea badge skeleton popover calendar tabs
```

### Route structure

```
apps/web/app/
├── (chat)/                                           # Route group — chat layout
│   ├── layout.tsx                                    # Auth gate + three-panel shell
│   └── w/
│       └── [workspaceId]/
│           └── c/
│               └── [channelId]/
│                   ├── page.tsx                      # Channel view entry point
│                   ├── _components/                  # Phase 10
│                   ├── _hooks/                       # Phase 10
│                   └── _libs/                        # Phase 10
├── page.tsx                                          # Landing — modified to redirect
```

### Files to create

#### 7.1 `apps/web/app/(chat)/layout.tsx` — Server Component

```typescript
// 1. Call getServerSession()
// 2. If no session → redirect to '/' (landing page with sign-in)
// 3. Render the three-panel layout shell:
//    <div className="flex h-screen">
//      <WorkspaceSidebar />          {/* narrow icon strip */}
//      <ChannelSidebar />            {/* channel list */}
//      <main className="flex-1">
//        {children}                  {/* message area from page.tsx */}
//      </main>
//    </div>
```

This layout wraps all `/(chat)/*` routes. The workspace and channel sidebars are client components that read params from the URL.

#### 7.2 `apps/web/app/(chat)/_components/workspace-sidebar.tsx` — Client Component

- Narrow vertical strip (~72px wide) on the far left
- Lists workspace icons/avatars vertically
- Active workspace highlighted
- "+" button at bottom to create workspace (opens dialog from Phase 8)
- Each icon is a `<Link>` to `/(chat)/w/{workspaceId}/c/{defaultChannelId}`
- Uses `useWorkspaces()` hook (Phase 8) to fetch workspace list

#### 7.3 `apps/web/app/(chat)/_components/channel-sidebar.tsx` — Client Component

- Second panel (~240px wide)
- Shows workspace name at top with settings dropdown
- Lists channels with `#` prefix
- Active channel highlighted based on URL param
- "+" button to create channel (opens dialog from Phase 9)
- Each channel is a `<Link>` to `/(chat)/w/{workspaceId}/c/{channelId}`
- Uses `useChannels(workspaceId)` hook (Phase 9) to fetch channel list

#### 7.4 `apps/web/lib/socket.ts` — Socket.IO client singleton

```typescript
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
```

- `autoConnect: false` — only connects when explicitly called
- `withCredentials: true` — sends session cookie with handshake
- Singleton prevents duplicate connections during HMR

#### 7.5 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/page.tsx` — Server Component shell

```typescript
// Minimal server component that passes params to client component
// The actual message list + input lives in Phase 10

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;
  return <ChannelView workspaceId={workspaceId} channelId={channelId} />;
}
```

### Files to modify

#### 7.6 `apps/web/app/page.tsx`

Add a redirect for authenticated users:

```typescript
// At the top of the Server Component:
const session = await getServerSession();
if (session?.data?.user) {
  redirect('/(chat)'); // or redirect to first workspace
}
// Otherwise render the existing landing page with AuthPanel
```

### Verification
- Run dev server (`bun run dev`)
- Sign in → should redirect to `/(chat)/`
- Three-panel layout renders (even if sidebars are empty placeholders)
- Not signed in → stays on landing page

---

## Phase 8 — Frontend: Workspace Management UI

### Goal
Users can create, view, switch between, edit, and delete workspaces.

### Files to create

#### 8.1 `apps/web/app/(chat)/_libs/workspaces.ts` — Axios API functions

```typescript
export const workspaceQueryKey = ['workspaces'] as const;

export async function fetchWorkspaces(ctx?: { signal?: AbortSignal }): Promise<Workspace[]>;
export async function fetchWorkspace(id: string, ctx?: { signal?: AbortSignal }): Promise<Workspace>;
export async function createWorkspace(dto: CreateWorkspaceDto): Promise<Workspace>;
export async function updateWorkspace(id: string, dto: UpdateWorkspaceDto): Promise<Workspace>;
export async function deleteWorkspace(id: string): Promise<void>;
export async function addWorkspaceMember(id: string, dto: { email: string }): Promise<void>;
export async function removeWorkspaceMember(id: string, userId: string): Promise<void>;
```

All functions use the shared `api` instance from `lib/api.ts` and pass `signal` for cancellation.

#### 8.2 `apps/web/app/(chat)/_hooks/use-workspaces.ts` — TanStack Query hooks

```typescript
export function useWorkspaces();           // useQuery — list all workspaces
export function useWorkspace(id: string);  // useQuery — single workspace
export function useCreateWorkspace();      // useMutation — invalidates workspace list
export function useUpdateWorkspace();      // useMutation — invalidates workspace list + detail
export function useDeleteWorkspace();      // useMutation — invalidates, navigate to next workspace
```

#### 8.3 `apps/web/app/(chat)/_components/create-workspace-dialog.tsx`

- Dialog with form: name input + icon emoji picker (simple text input for V1)
- Uses `useCreateWorkspace()` mutation
- On success: close dialog, navigate to new workspace's #general channel
- Uses shadcn `Dialog`, `Input`, `Label`, `Button`

#### 8.4 `apps/web/app/(chat)/_components/workspace-settings-dialog.tsx`

- Dialog showing workspace settings
- Edit name and icon
- Member list (names + emails)
- Add member by email
- Remove member (owner only)
- Delete workspace (owner only, with confirmation)
- Uses shadcn `Dialog`, `Input`, `Label`, `Button`, `Separator`, `Avatar`

### Verification
- Create a workspace → appears in sidebar
- Click workspace icon → navigates to its #general channel
- Open settings → can rename, see members
- Delete workspace → navigates to another workspace or shows empty state

---

## Phase 9 — Frontend: Channel Management UI

### Goal
Users can create, view, switch between, edit, and delete channels within a workspace.

### Files to create

#### 9.1 `apps/web/app/(chat)/_libs/channels.ts` — Axios API functions

```typescript
export const channelQueryKey = (workspaceId: string) => ['workspaces', workspaceId, 'channels'] as const;

export async function fetchChannels(workspaceId: string, ctx?: { signal?: AbortSignal }): Promise<Channel[]>;
export async function fetchChannel(workspaceId: string, channelId: string, ctx?: { signal?: AbortSignal }): Promise<Channel>;
export async function createChannel(workspaceId: string, dto: CreateChannelDto): Promise<Channel>;
export async function updateChannel(workspaceId: string, channelId: string, dto: UpdateChannelDto): Promise<Channel>;
export async function deleteChannel(workspaceId: string, channelId: string): Promise<void>;
```

#### 9.2 `apps/web/app/(chat)/_hooks/use-channels.ts`

```typescript
export function useChannels(workspaceId: string);           // useQuery
export function useChannel(workspaceId: string, id: string); // useQuery
export function useCreateChannel(workspaceId: string);       // useMutation
export function useUpdateChannel(workspaceId: string);       // useMutation
export function useDeleteChannel(workspaceId: string);       // useMutation
```

#### 9.3 `apps/web/app/(chat)/_components/create-channel-dialog.tsx`

- Dialog: channel name + optional description
- Auto-prepends `#` visually but stores without it
- Uses `useCreateChannel()` mutation
- On success: close, navigate to new channel

#### 9.4 `apps/web/app/(chat)/_components/channel-settings-dialog.tsx`

- Edit name and description
- Delete channel (with confirmation, prevented if it's the last channel)

### Verification
- Create a channel → appears in sidebar
- Click channel → navigates, URL updates
- Delete channel → redirects to #general
- Try to delete last channel → error toast

---

## Phase 10 — Frontend: Messaging UI

### Goal
Full messaging experience: send messages, see real-time updates, scroll through history with virtual scrolling, edit/delete own messages.

### Files to create

#### 10.1 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_libs/messages.ts`

```typescript
export const messageQueryKey = (channelId: string) => ['channels', channelId, 'messages'] as const;

export async function fetchMessages(channelId: string, cursor?: string, limit?: number, ctx?: { signal?: AbortSignal }): Promise<PaginatedMessages>;
export async function sendMessage(channelId: string, dto: { content: string }): Promise<Message>;
export async function editMessage(channelId: string, messageId: string, dto: { content: string }): Promise<Message>;
export async function deleteMessage(channelId: string, messageId: string): Promise<void>;
```

#### 10.2 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_hooks/use-messages.ts`

```typescript
export function useMessages(channelId: string);
// Uses useInfiniteQuery with cursor-based pagination
// queryFn fetches newest messages first
// getNextPageParam extracts nextCursor from response
// Pages are reversed for display (oldest at top)

export function useSendMessage(channelId: string);
// useMutation — optimistically adds message to cache
// On error: rolls back optimistic update

export function useEditMessage(channelId: string);
// useMutation — updates message in cache

export function useDeleteMessage(channelId: string);
// useMutation — removes message from cache
```

#### 10.3 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_hooks/use-socket.ts`

```typescript
export function useSocket(channelId: string);
// 1. On mount: connect socket (if not connected), emit 'join_channel'
// 2. Listen for 'new_message' → insert into TanStack Query cache
//    - Deduplicate by message ID (skip if already in cache from optimistic update)
//    - Use queryClient.setQueryData to surgically update without refetch
// 3. Listen for 'message_updated' → update in cache
// 4. Listen for 'message_deleted' → remove from cache
// 5. Listen for 'user_typing' → update typing state
// 6. On channelId change: leave old channel, join new channel
// 7. On unmount: leave channel
// Returns: { typingUsers: string[] }
```

#### 10.4 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_components/channel-header.tsx`

- Channel name with `#` prefix
- Channel description (if any)
- Export button (opens export dialog from Phase 11)
- Channel settings button (opens settings dialog from Phase 9)

#### 10.5 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_components/message-list.tsx`

**This is the most complex component.**

- Uses `@tanstack/react-virtual` for virtualized rendering
- `column-reverse` CSS on the scroll container for bottom-anchored layout
- `useMessages(channelId)` for data
- `useSocket(channelId)` for real-time updates
- Infinite scroll: when user scrolls to top, call `fetchNextPage()` to load older messages
- Auto-scroll to bottom when new message arrives (only if user is already at bottom)
- Date separator rows between messages from different dates
- Loading skeleton while fetching
- "No messages yet" empty state
- Typing indicator at bottom: "{User} is typing..."

#### 10.6 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_components/message-item.tsx`

- Sender avatar (first letter fallback if no image)
- Sender name + relative timestamp (e.g., "2:15 PM" or "Yesterday at 2:15 PM")
- Message content
- "Edited" indicator if `updatedAt > createdAt`
- Hover actions (visible on hover): edit, delete — only for own messages
- Edit mode: inline textarea replacing content, Enter to save, Escape to cancel
- Uses shadcn `Avatar`, `DropdownMenu`, `Button`

#### 10.7 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_components/message-input.tsx`

- Textarea at bottom of message area
- `Enter` to send, `Shift+Enter` for newline
- Disabled while sending (optimistic update handles instant feedback)
- Emits `typing` event on input (debounced, ~2 second cooldown)
- Auto-focus on channel change
- Placeholder: "Message #channel-name"

### Verification
- Send a message → appears instantly (optimistic)
- Open two browser tabs in same channel → message appears in both
- Scroll up → older messages load
- Edit own message → updates in both tabs
- Delete own message → removed in both tabs
- Type in one tab → "X is typing..." appears in the other
- Refresh page → message history is persisted and loads

---

## Phase 11 — Frontend: Export UI

### Goal
Users can export a channel's message history as clean markdown, with optional date filtering. They can copy to clipboard or download as a `.md` file.

### Files to create

#### 11.1 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_libs/export.ts`

```typescript
export async function fetchExport(
  channelId: string,
  from?: string,
  to?: string,
  ctx?: { signal?: AbortSignal },
): Promise<string>;
// GET /channels/{channelId}/export?from=...&to=...
// Returns raw markdown text (responseType: 'text')
```

#### 11.2 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_components/export-dialog.tsx`

- Triggered by "Export" button in channel header
- **Date range section:**
  - Toggle: "Full history" (default) or "Custom range"
  - When custom: two date pickers (from / to) using shadcn `Calendar` + `Popover`
- **Preview tab:**
  - Fetches markdown preview when dialog opens or date range changes
  - Renders the raw markdown in a `<pre>` block with `ScrollArea`
  - Shows loading skeleton while fetching
- **Actions:**
  - "Copy to Clipboard" button — uses `navigator.clipboard.writeText(markdown)`, shows success toast
  - "Download .md" button — creates `Blob`, generates download URL, triggers download with filename `{workspace}-{channel}-{date}.md`
- **Message count and date range** shown as summary text
- Uses shadcn `Dialog`, `Tabs`, `Calendar`, `Popover`, `Button`, `ScrollArea`

### Files to modify

#### 11.3 `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_components/channel-header.tsx`

Add the export button that opens the export dialog.

### Verification
- Click export → dialog opens with full history preview
- Select date range → preview updates
- Click "Copy to Clipboard" → paste in a text editor, verify clean markdown
- Click "Download .md" → file downloads with correct name
- Paste exported markdown into ChatGPT or Claude → it should be immediately usable as context with no cleanup needed

---

## Dependency Graph

```
Phase 1 (Schema)
  │
  ├── Phase 2 (Workspaces) ──┐
  │                           │
  │   Phase 3 (Channels) ────┤
  │                           │
  │   Phase 4 (Messages) ────┤
  │       │                   │
  │       ├── Phase 5 (WS) ──┤
  │       │                   │
  │       └── Phase 6 (Export)│
  │                           │
  └───────────────────────────┘
                              │
  Phase 7 (Layout) ──────────┤
  │                           │
  ├── Phase 8 (Workspace UI) │
  │                           │
  ├── Phase 9 (Channel UI) ──┤
  │                           │
  ├── Phase 10 (Messaging UI)│
  │                           │
  └── Phase 11 (Export UI) ──┘
```

**Parallelism opportunities:**
- Phases 2, 3, 4 can be developed in parallel (they share schema but are independent modules)
- Phases 5 and 6 can be developed in parallel (both depend on Phase 4)
- Phase 7 can start as soon as Phase 2 has the workspace list endpoint
- Phases 8, 9 can be developed in parallel
- Phase 11 can start as soon as Phase 6 (export backend) is complete

---

## Verification Plan

### Per-phase checks

| Phase | What to verify |
|-------|---------------|
| 1 | Tables exist in `db:studio`, FK cascades work |
| 2 | CRUD via curl, auto-created #general, membership checks |
| 3 | CRUD via curl, unique name constraint, can't delete last channel |
| 4 | Send + list messages, cursor pagination, edit/delete auth |
| 5 | Socket connects with cookie, join/leave channel, real-time events |
| 6 | Export endpoint returns clean markdown, date range works |
| 7 | Three-panel layout renders, auth redirect works |
| 8 | Create/switch/edit/delete workspaces in UI |
| 9 | Create/switch/edit/delete channels in UI |
| 10 | Send messages, real-time in two tabs, scroll history, edit/delete |
| 11 | Export dialog, date picker, copy to clipboard, download .md |

### End-to-end smoke test

1. Sign up two users (User A and User B)
2. User A creates workspace "Engineering" with icon 🚀
3. Verify #general channel auto-created
4. User A creates channel #architecture-decisions with description "Key tech decisions"
5. User A invites User B by email
6. User B sees "Engineering" workspace in their sidebar
7. Both users open #architecture-decisions
8. User A sends: "Should we use REST or GraphQL for V1?"
9. Message appears in User B's view in real time
10. User B replies: "REST is simpler, let's start there"
11. User A sees the reply in real time
12. User A edits their message to add more context
13. Edit appears in User B's view
14. User A exports #architecture-decisions as markdown
15. Paste into Claude → it should be readable, structured, and immediately usable
16. Export with date range → only messages in range appear
17. Download as .md file → file is clean and well-formatted

---

## File Summary

### New files (~50 total)

**Backend (20 files):**
- 4 schema files (Phase 1)
- 3 workspace module files (Phase 2)
- 3 channel module files (Phase 3)
- 3 message module files (Phase 4)
- 2 gateway module files (Phase 5)
- 3 export module files (Phase 6)

**Frontend (30 files):**
- 1 chat layout (Phase 7)
- 1 socket client utility (Phase 7)
- 3 sidebar components (Phase 7)
- 1 channel page (Phase 7)
- 2 workspace components + 1 hook + 1 lib (Phase 8)
- 2 channel components + 1 hook + 1 lib (Phase 9)
- 4 message components + 2 hooks + 1 lib (Phase 10)
- 1 export component + 1 lib (Phase 11)

### Modified files (4 total)
- `apps/api/src/database/schema/index.ts` — add schema re-exports
- `apps/api/src/app.module.ts` — import 5 new modules
- `apps/web/app/page.tsx` — redirect authenticated users
- `apps/web/app/(chat)/w/[workspaceId]/c/[channelId]/_components/channel-header.tsx` — add export button (Phase 11)
