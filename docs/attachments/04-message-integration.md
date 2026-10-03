# Step 4 — Message integration

Goal: messages can carry attachments. Creating, listing, updating, deleting, and the realtime socket all understand them.

## 4.1 Extend `MessagesService.create`

Update the signature to accept attachment ids and finalize them in the same transaction-ish flow:

```typescript
async create(
  channelId: string,
  senderId: string,
  content: string,
  attachmentIds: string[] = [],
) {
  await this.verifyChannelAccess(channelId, senderId, PERMISSIONS.SEND_MESSAGES);

  // A message must have content OR at least one attachment.
  if (!content.trim() && attachmentIds.length === 0) {
    throw new BadRequestException('Empty message');
  }
  if (attachmentIds.length > 10) {
    throw new BadRequestException('Maximum 10 attachments per message');
  }

  const messageId = crypto.randomUUID();
  const now = new Date();

  // 1. Validate every attachment belongs to this uploader + channel and is pending.
  const rows = attachmentIds.length
    ? await this.drizzle.db
        .select()
        .from(attachments)
        .where(
          and(
            inArray(attachments.id, attachmentIds),
            eq(attachments.uploaderId, senderId),
            eq(attachments.channelId, channelId),
          ),
        )
    : [];

  if (rows.length !== attachmentIds.length) {
    throw new BadRequestException('Invalid attachment reference');
  }

  // 2. HEAD each pending object to confirm upload (skip if already uploaded).
  for (const row of rows) {
    if (row.status === 'uploaded') continue;
    const head = await this.storage.head(row.storageKey);
    if (!head) throw new BadRequestException(`Attachment ${row.id} not uploaded`);
  }

  // 3. Insert the message + stamp attachments.
  await this.drizzle.db.transaction(async (tx) => {
    await tx.insert(messages).values({
      id: messageId,
      channelId,
      senderId,
      content,
      createdAt: now,
      updatedAt: now,
    });
    if (rows.length) {
      await tx
        .update(attachments)
        .set({ messageId, status: 'uploaded' })
        .where(inArray(attachments.id, rows.map((r) => r.id)));
    }
  });

  // 4. Read back the full message with attachments for the socket payload.
  const message = await this.findOneWithAttachments(messageId);
  this.chatGateway.emitNewMessage(channelId, message);
  return message;
}
```

Inject `StorageService` into `MessagesModule` (and re-export `AttachmentsModule`'s service if needed for the HEAD call — or just inject `StorageService` directly since it's global).

## 4.2 Extend `findAll` to include attachments

For each page of messages, fetch the attachments in a second query and zip them in. Keep the cursor logic untouched.

```typescript
const ids = data.map((m) => m.id);
const attachmentRows = ids.length
  ? await this.drizzle.db
      .select()
      .from(attachments)
      .where(inArray(attachments.messageId, ids))
  : [];

const grouped = new Map<string, Attachment[]>();
for (const a of attachmentRows) {
  if (!a.messageId) continue;
  const list = grouped.get(a.messageId) ?? [];
  list.push(a);
  grouped.set(a.messageId, list);
}

const enriched = data.map((m) => ({
  ...m,
  attachments: grouped.get(m.id) ?? [],
}));
```

Avoid leaking `storageKey` to the client — strip it in the response shape, or use a `select` with the columns the client actually needs (`id`, `filename`, `contentType`, `sizeBytes`).

## 4.3 Delete cascade

`messages.id` is the FK target with `onDelete: 'cascade'` — deleting a message already deletes attachment rows. To delete R2 objects too, hook the existing `MessagesService.remove`:

```typescript
const toDelete = await this.drizzle.db
  .select({ storageKey: attachments.storageKey })
  .from(attachments)
  .where(eq(attachments.messageId, id));

await this.drizzle.db.delete(messages).where(eq(messages.id, id));

// Best-effort: don't block the response on storage cleanup.
void Promise.all(
  toDelete.map((a) => this.storage.delete(a.storageKey).catch(() => {})),
);
```

R2 deletes are eventually consistent and failures here aren't user-visible. The orphan cleanup job (step 6) sweeps anything missed.

## 4.4 Edit semantics

Keep edits to **text only** in v1. The existing `update` method continues to update `content`. Attachments are immutable once a message is sent — simpler UX and simpler code. Document this in the UI ("attachments can't be edited").

## 4.5 Socket payload

`ChatGateway.emitNewMessage` already broadcasts the message object. Including `attachments` in the payload means every connected client renders them instantly. Same for `emitMessageUpdated` (no attachment changes, but the shape stays consistent) and `emitMessageDeleted` (id only, unchanged).

## 4.6 Frontend types

Update `apps/web/app/(chat)/w/(chat-shell)/[workspaceId]/c/[channelId]/_libs/messages.ts`:

```typescript
export type MessageAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type Message = {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  sender: { name: string | null; image: string | null } | null;
  attachments: MessageAttachment[];
};

export async function fetchAttachmentDownloadUrl(
  attachmentId: string,
  ctx?: { signal?: AbortSignal },
): Promise<{ url: string; filename: string; contentType: string }> {
  const { data } = await api.get(`/attachments/${attachmentId}/download-url`, {
    signal: ctx?.signal,
  });
  return data;
}
```

And the send mutation now takes optional attachment ids:

```typescript
export async function sendMessage(
  channelId: string,
  content: string,
  attachmentIds: string[] = [],
): Promise<Message> {
  const { data } = await api.post<Message>(`/channels/${channelId}/messages`, {
    content,
    attachmentIds,
  });
  return data;
}
```

## Verification

- Pre-upload 2 files via `/attachments/presign` + PUT, then `POST /channels/:id/messages` with both ids → message comes back with `attachments: [...]`.
- A second client connected to the same channel via socket sees the message + attachments live.
- Deleting the message removes the attachment rows; R2 objects disappear shortly after.

Once green, move to [05-frontend-attachment-ui.md](05-frontend-attachment-ui.md).
