# Step 7 — Testing & rollout

Goal: have confidence the feature works end-to-end before merging, and a clean rollout plan.

## 7.1 Manual test matrix

Run through this list locally with two browser windows (sender + viewer in different accounts, both members of the same workspace).

### Happy paths

- [ ] Send a message with text only (regression check).
- [ ] Send a message with a single image (`jpg`, `png`, `gif`, `webp`).
- [ ] Send a message with multiple images (grid layout).
- [ ] Send a message with a single PDF (file card renders).
- [ ] Send a message with a mix (1 image + 1 PDF).
- [ ] Send a message with attachments only, no text.
- [ ] Drag and drop a single file from the desktop.
- [ ] Drag and drop multiple files at once.
- [ ] Paste a screenshot from clipboard.
- [ ] Remove a file from the preview tray before sending.
- [ ] Click an image in a message → lightbox opens; Esc closes it.
- [ ] Download a file card attachment → file lands in Downloads.
- [ ] Delete a message with attachments → both clients see it disappear, R2 objects removed.

### Edge cases

- [ ] Unsupported MIME (`.exe`, `.app`) → friendly toast, no upload.
- [ ] Oversized file (> 25 MiB) → friendly toast, no upload.
- [ ] Network drop mid-upload → item shows error state with retry button.
- [ ] Two rapid sends with overlapping uploads → each message gets its own attachments.
- [ ] Close the tab during upload → re-open → no zombie tray state (state is per-session).
- [ ] Pick a file but never send → after orphan cleanup runs, row and R2 object are gone.

### Permission cases

- [ ] User without `SEND_MESSAGES` does not see the `+` button (or sees it disabled).
- [ ] User without `VIEW_CHANNEL` cannot fetch a download URL even with a known attachment id.
- [ ] User cannot reference another user's pending attachment id in a message.

### Realtime

- [ ] Viewer in another tab receives the message with attachments via socket within ~100 ms of send.
- [ ] Viewer joining the channel after the message was sent sees the attachments on initial load.

## 7.2 Automated tests

### API (`apps/api/test/`)

E2E tests using the existing Jest setup. Cover at least:

- `POST /attachments/presign` happy path returns `{ attachmentId, uploadUrl, key }` with the key shape `<workspaceId>/<channelId>/<uuid>.<ext>`.
- Presign rejects unsupported MIME (400).
- Presign rejects oversized (400).
- Presign rejects without `SEND_MESSAGES` (403).
- Message create with a stranger's attachmentId is rejected (400).
- Message create with a not-yet-uploaded attachment is rejected (400).
- `GET /attachments/:id/download-url` returns 403 when viewer lacks `VIEW_CHANNEL`.

Stub `StorageService` in the e2e module so tests don't hit real R2.

### Web

Light coverage — TanStack Query hooks and the upload state machine. Use Vitest if it's already wired; otherwise rely on the manual matrix above for v1.

## 7.3 Verification via preview tools

Once the UI is wired, use the `preview_*` tools end-to-end:

1. `preview_start` (Next dev).
2. Sign in, navigate to a channel.
3. `preview_click` the `+` button → `preview_snapshot` confirms the file dialog (or use `preview_eval` to set a file on the hidden input).
4. `preview_snapshot` after upload → tray has the preview.
5. Send → `preview_snapshot` shows the message with attachment.
6. `preview_network` shows the presign call and the PUT to R2.
7. `preview_console_logs` shows no errors.
8. `preview_screenshot` for the PR description.

## 7.4 Rollout checklist

- [ ] R2 bucket provisioned for production with CORS configured for the prod web origin.
- [ ] Production API has all `R2_*` env vars set.
- [ ] Migration `attachments` applied to production DB.
- [ ] `@nestjs/schedule` (or chosen scheduler) running in production with the orphan sweep.
- [ ] Document the 25 MiB per-file limit in the user-facing UI copy.
- [ ] Smoke test in prod with a throwaway workspace: upload, view, download, delete.
- [ ] Monitor the first 24 hours: presign rate, finalize failures, R2 storage growth.

## 7.5 Follow-up work (not blocking v1)

- Image resizing / thumbnail pipeline (e.g. Cloudflare Images, or a worker on object create).
- Per-workspace storage quota + UI usage indicator.
- Inline video thumbnails (poster frames) — currently videos load metadata only.
- SVG support with strict sanitization if there's user demand.
- Virus scanning (ClamAV worker or a third-party API) on `finalize`.
- Dedup by content hash — if a user uploads the same file twice, reuse the existing key.
- Replace per-file presign+PUT with multipart uploads for >25 MiB ceilings.
- Soft-delete + "deleted message" placeholder instead of a hard cascade.
