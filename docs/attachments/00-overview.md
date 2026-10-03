# Feature: Chat Attachments (Discord-style)

Allow users to attach files (images, videos, documents) to chat messages. Uploads land in Cloudflare R2 using the AWS SDK v3 (S3-compatible API). The UX mirrors Discord: click a `+` button (or drag-and-drop / paste), see a preview tray above the input, then send.

## Goals

- Users can attach one or more files to a message before sending.
- Files live in Cloudflare R2 under the path `<workspaceId>/<channelId>/<uuid>.<ext>`.
- The message and its attachments are atomic: a single send produces a message with N attachments.
- Images render inline in the message list with a lightbox. Other files render as a download card.
- Permission-gated: only users with `SEND_MESSAGES` can upload to a channel; viewers can download what they're allowed to view.

## Non-goals (v1)

- No video transcoding, thumbnailing, or image resizing pipeline.
- No client-side image editing or markup.
- No paid storage quota enforcement (track size only).
- No virus scanning (note as a future hardening item).

## Naming convention

The user-facing brief says `/[serverId]/[channelId]/uuid.jpg`. This codebase calls a "server" a **workspace** (`workspaceId`). The object key pattern is therefore:

```
<workspaceId>/<channelId>/<uuid>.<ext>
```

Where:
- `workspaceId` — the parent workspace of the channel (resolved server-side from the channel, never trusted from the client).
- `channelId` — the channel the message is being posted to.
- `uuid` — a freshly generated v4 UUID per attachment (no user-supplied filenames in the key).
- `ext` — the lowercased extension derived from the original file's MIME type / filename, validated against an allowlist.

The original filename is stored in the database for display only.

## High-level architecture

```
[Web client]
   │
   ├─ 1. Select files in message input
   │
   ├─ 2. POST /attachments/presign  ──►  [API] returns { uploadUrl, key, attachmentId } per file
   │                                       (verifies SEND_MESSAGES on channel)
   │
   ├─ 3. PUT file directly to R2 via presigned URL  ──►  [Cloudflare R2]
   │
   └─ 4. POST /channels/:id/messages  ──►  [API] creates message + attachment rows
                                            (validates each attachmentId belongs to this user, channel, and is uploaded)
                                            emits message via ChatGateway
```

Direct-to-R2 uploads keep large file bytes off the NestJS server. The API only ever brokers presigned URLs and persists metadata.

## Step-by-step plan

The plan is split into ordered files. Work through them in order; each step is independently shippable behind the next one.

1. [01-r2-storage-setup.md](01-r2-storage-setup.md) — Provision R2 bucket, env vars, install AWS SDK, shared S3 client module.
2. [02-database-schema.md](02-database-schema.md) — `attachments` table, Drizzle schema, migration.
3. [03-backend-upload-api.md](03-backend-upload-api.md) — `AttachmentsModule` with presign + finalize endpoints, key builder, MIME allowlist.
4. [04-message-integration.md](04-message-integration.md) — Extend message create/read to include attachments; wire socket events.
5. [05-frontend-attachment-ui.md](05-frontend-attachment-ui.md) — Discord-style picker, preview tray, drag-drop, paste-to-upload, lightbox, download card.
6. [06-permissions-security.md](06-permissions-security.md) — Permission checks, size/MIME validation, signed download URLs, cleanup of orphans.
7. [07-testing-rollout.md](07-testing-rollout.md) — Manual test matrix, e2e tests, rollout checklist.

## Definition of done

- [ ] User can click a `+` button next to the message input and pick files.
- [ ] User can drag files onto the channel view to attach.
- [ ] User can paste an image from clipboard to attach.
- [ ] Preview tray shows thumbnails (images) or filename + size (other) with a remove button per file.
- [ ] Send button is disabled while uploads are in flight; it's enabled once all uploads finish or when there's text + no attachments.
- [ ] Sent message renders attachments inline (images shown, others as a card) for all viewers in real time.
- [ ] Object keys follow `<workspaceId>/<channelId>/<uuid>.<ext>`.
- [ ] All API endpoints enforce channel permissions.
- [ ] Deleting a message deletes its attachment rows and the R2 objects.
