# Step 3 — Backend upload API

Goal: a `AttachmentsModule` that brokers presigned uploads, finalizes uploaded files, and issues signed download URLs — all permission-gated.

## 3.1 Module layout

```
apps/api/src/attachments/
├── attachments.module.ts
├── attachments.controller.ts
├── attachments.service.ts
├── attachments.helpers.ts   # key builder, ext/MIME allowlist
└── dto/
    ├── presign-upload.dto.ts
    └── presign-upload-response.dto.ts
```

Register `AttachmentsModule` in `app.module.ts`.

## 3.2 MIME allowlist + extension mapping

In `attachments.helpers.ts`:

```typescript
export const ATTACHMENT_MIME_ALLOWLIST: Record<string, string> = {
  // images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  // video
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  // audio
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  // documents
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/zip': 'zip',
  // office
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

export function extensionForContentType(contentType: string): string | null {
  return ATTACHMENT_MIME_ALLOWLIST[contentType.toLowerCase()] ?? null;
}

export function buildStorageKey(
  workspaceId: string,
  channelId: string,
  ext: string,
): { key: string; id: string } {
  const id = crypto.randomUUID();
  return { id, key: `${workspaceId}/${channelId}/${id}.${ext}` };
}
```

The MIME list can grow over time. Reject anything not in the map at presign time — never trust the client extension.

> **Keep in sync with the web allowlist.** The web client mirrors this map at `apps/web/lib/attachment-mime.ts` for its `accept=` attribute and pre-flight `validateFiles()` check (see [05-frontend-attachment-ui.md](05-frontend-attachment-ui.md) §5.0). When you add or remove an entry here, update that file in the same PR. The server remains the source of truth — the web filter is for UX, not security.

## 3.3 DTOs

```typescript
// presign-upload.dto.ts
export class PresignUploadDto {
  channelId!: string;
  filename!: string;
  contentType!: string;
  sizeBytes!: number;
}
```

Validate with `class-validator` (`@IsString`, `@IsInt`, `@Min(1)`, `@MaxLength`) — add it as a dep if not already present, or hand-validate in the service for simplicity.

## 3.4 Service

```typescript
@Injectable()
export class AttachmentsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly workspacePermissions: WorkspacePermissionsService,
  ) {}

  async presignUpload(userId: string, dto: PresignUploadDto) {
    // 1. Resolve workspaceId from channel + assert SEND_MESSAGES.
    const channel = await this.workspacePermissions.assertChannelPermissionByChannelId(
      dto.channelId,
      userId,
      PERMISSIONS.SEND_MESSAGES,
    );

    // 2. Validate MIME + size.
    const ext = extensionForContentType(dto.contentType);
    if (!ext) throw new BadRequestException('Unsupported file type');
    const maxBytes = Number(process.env.R2_MAX_UPLOAD_BYTES ?? 26214400);
    if (dto.sizeBytes <= 0 || dto.sizeBytes > maxBytes) {
      throw new BadRequestException(`File too large (max ${maxBytes} bytes)`);
    }

    // 3. Build key, insert pending row.
    const { id, key } = buildStorageKey(channel.workspaceId, dto.channelId, ext);
    await this.drizzle.db.insert(attachments).values({
      id,
      workspaceId: channel.workspaceId,
      channelId: dto.channelId,
      uploaderId: userId,
      storageKey: key,
      filename: dto.filename.slice(0, 255),
      contentType: dto.contentType,
      sizeBytes: dto.sizeBytes,
      status: 'pending',
    });

    // 4. Presign PUT.
    const uploadUrl = await this.storage.presignUpload(key, dto.contentType, maxBytes);
    return { attachmentId: id, uploadUrl, key };
  }

  async finalize(userId: string, attachmentId: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId));
    if (!row || row.uploaderId !== userId) throw new NotFoundException();
    if (row.status === 'uploaded') return row;

    const head = await this.storage.head(row.storageKey);
    if (!head) throw new BadRequestException('Upload not found in storage');
    if (head.size !== row.sizeBytes) {
      // Trust the actual size — update the row.
      await this.drizzle.db
        .update(attachments)
        .set({ sizeBytes: head.size, status: 'uploaded' })
        .where(eq(attachments.id, attachmentId));
      return { ...row, sizeBytes: head.size, status: 'uploaded' as const };
    }

    await this.drizzle.db
      .update(attachments)
      .set({ status: 'uploaded' })
      .where(eq(attachments.id, attachmentId));
    return { ...row, status: 'uploaded' as const };
  }

  async getDownloadUrl(userId: string, attachmentId: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId));
    if (!row) throw new NotFoundException();

    await this.workspacePermissions.assertChannelPermissionByChannelId(
      row.channelId,
      userId,
      PERMISSIONS.VIEW_CHANNEL,
    );

    const url = await this.storage.presignDownload(row.storageKey);
    return { url, filename: row.filename, contentType: row.contentType };
  }
}
```

`assertChannelPermissionByChannelId` should return (or be wrapped to return) the channel row including `workspaceId` — adjust the existing helper if it doesn't already. This is the only required tweak to existing code in this step.

## 3.5 Controller

```typescript
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('presign')
  presign(
    @Session() session: UserSession<typeof auth>,
    @Body() dto: PresignUploadDto,
  ) {
    return this.attachments.presignUpload(session.user.id, dto);
  }

  @Post(':id/finalize')
  finalize(
    @Session() session: UserSession<typeof auth>,
    @Param('id') id: string,
  ) {
    return this.attachments.finalize(session.user.id, id);
  }

  @Get(':id/download-url')
  download(
    @Session() session: UserSession<typeof auth>,
    @Param('id') id: string,
  ) {
    return this.attachments.getDownloadUrl(session.user.id, id);
  }
}
```

All endpoints sit behind the existing Better Auth `@Session()` decorator — no anonymous access.

## 3.6 Two-phase finalize: where is it called from?

`finalize` is called by the **message create endpoint**, not by the client directly. See [04-message-integration.md](04-message-integration.md) — the client only:

1. Presigns each file.
2. PUTs each file to R2.
3. Calls `POST /channels/:id/messages` with `{ content, attachmentIds: [...] }`.

The message service then verifies each attachment belongs to the same uploader + same channel, finalizes them (HEAD check), and stamps `messageId`. This way a client can never produce a message with broken attachment references.

The `/finalize` endpoint above is kept as a public API for resilience (e.g. retry after a flaky send) but is not the primary path.

## Verification

- Sign in via the web client, hit `POST /attachments/presign` with a valid channel — get a URL.
- `curl -X PUT --data-binary @some.png -H 'content-type: image/png' <uploadUrl>` succeeds.
- A `pending` row exists in `attachments`.
- `GET /attachments/:id/download-url` returns a working URL after finalize.

Once green, move to [04-message-integration.md](04-message-integration.md).
