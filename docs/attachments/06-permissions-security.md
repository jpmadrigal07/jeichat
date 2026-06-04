# Step 6 — Permissions, security, cleanup

Goal: every code path that touches an attachment enforces channel permissions, validates inputs, and we don't leak orphaned objects in R2.

## 6.1 Permission matrix

| Action | Endpoint | Required permission |
|---|---|---|
| Presign upload | `POST /attachments/presign` | `SEND_MESSAGES` on the target channel |
| Finalize | `POST /attachments/:id/finalize` | uploader === current user (no permission check needed beyond ownership) |
| Get download URL | `GET /attachments/:id/download-url` | `VIEW_CHANNEL` on the attachment's channel |
| Create message with attachments | `POST /channels/:id/messages` | `SEND_MESSAGES` on channel + uploader === current user for every attachment id |
| Delete message | existing `DELETE /channels/:cid/messages/:mid` | existing rule (sender or moderator) — cascades to attachments |

The single source of truth for these checks is `WorkspacePermissionsService.assertChannelPermissionByChannelId`. Do **not** re-implement permission logic in the attachments module.

## 6.2 Input validation hard rules

- `contentType` must be in the MIME allowlist (step 3.2).
- `sizeBytes` must be `> 0` and `<= R2_MAX_UPLOAD_BYTES` (default 25 MiB).
- `filename` is truncated to 255 chars and stripped of control chars before storing for display.
- `channelId` is opaque — never echoed back into the storage key directly; the key uses the channel's verified id from the DB row, not the request body. (They're the same value; this just means: trust the DB, not the request, when building the key.)
- The number of attachments per message is capped (10). Reject anything more at message create time.

## 6.3 Defense against MIME spoofing

The client-declared `contentType` is what we put in the R2 metadata and presigned PUT. A malicious uploader can lie about it. Mitigations:

- The allowlist is small and conservative.
- On `finalize`, HEAD the object and store the **R2-reported size** (already in the plan). Consider also storing the server-observed `Content-Type` from HEAD if it differs.
- Download URLs are presigned with `ResponseContentDisposition: attachment; filename="<safe filename>"` for non-image types — forces a download instead of inline render, killing most browser-side exploit vectors.
- Inline rendering (`<img src>`, `<video src>`) is restricted to MIME types known to be safe to render. SVG is **not** in the allowlist (XSS risk via embedded scripts). If SVG support is later wanted, serve it with `Content-Disposition: attachment` only.

## 6.4 Signed URL TTLs

- Upload presign: 10 minutes (`R2_PRESIGN_EXPIRES_SECONDS=600`). Long enough for a slow connection, short enough to prevent token reuse.
- Download presign: 10 minutes per fetch. The client uses TanStack Query `staleTime` of ~5 min and refetches before expiry. Cache the URL in-memory, not in localStorage.

## 6.5 Orphan cleanup job

Add a scheduled task in the API. Two flavors of orphan:

1. **Pending attachments older than 1 hour with no `messageId`** — the user picked a file, the upload completed, but no message was ever sent.
2. **R2 objects with no matching `attachments.storageKey`** — out-of-band uploads or rows we lost via a partial failure.

Implementation: a `@Cron('0 * * * *')` (hourly) job on a new `AttachmentsCleanupService`. Nest supports this via `@nestjs/schedule` — install it if not already:

```typescript
@Cron('0 * * * *')
async sweep() {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const stale = await this.drizzle.db
    .select()
    .from(attachments)
    .where(and(eq(attachments.status, 'pending'), lt(attachments.createdAt, cutoff)));

  for (const row of stale) {
    await this.storage.delete(row.storageKey).catch(() => {});
    await this.drizzle.db.delete(attachments).where(eq(attachments.id, row.id));
  }
}
```

The second flavor (R2-side orphans) is a deferred reconciliation script — log it as a follow-up; in practice the first sweep covers >99% of cases since direct R2 writes are not possible without a presigned URL.

## 6.6 Rate limiting

Add a simple per-user limit at the presign endpoint to keep someone from minting thousands of URLs. Cheapest path: piggyback on Better Auth's Redis secondary storage with a counter keyed by `attachments-presign:<userId>:<minute>`. Cap at e.g. 60/minute. Skip in v1 if Redis isn't configured locally — add a `TODO: rate-limit` and ship it in step 7's hardening pass.

## 6.7 Logging

- Log every presign request with `userId`, `channelId`, `contentType`, `sizeBytes`.
- Log finalize failures (HEAD miss, size mismatch).
- Do **not** log the presigned URL itself — it's a bearer token.

## Verification

- Try `presign` on a channel where the user lacks `SEND_MESSAGES` → 403.
- Try `download-url` on an attachment in a channel the user can't view → 403.
- Try `presign` with `contentType: 'application/x-msdownload'` → 400.
- Try `presign` with `sizeBytes: 99999999` → 400.
- Send a message, then `DELETE` it → R2 object gone within seconds (check the dashboard).
- Pick a file, never send → after 1 hour (or manual cron trigger), row and object are gone.

Once green, move to [07-testing-rollout.md](07-testing-rollout.md).
