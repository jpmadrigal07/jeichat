# Step 5 — Frontend attachment UI (Discord-style)

Goal: a polished, Discord-style attachment UX layered over the existing message input and message list.

All new components live under the channel page:

```
apps/web/app/(chat)/w/(chat-shell)/[workspaceId]/c/[channelId]/
├── _components/
│   ├── message-input.tsx              # extend existing
│   ├── attachment-preview-tray.tsx    # new — thumbnails above the textarea
│   ├── attachment-picker-button.tsx   # new — the "+" button + hidden file input
│   ├── channel-drop-overlay.tsx       # new — fullscreen drop target overlay
│   ├── message-attachments.tsx       # new — renders attachments in a message
│   ├── attachment-image.tsx           # new — lightbox-capable image
│   └── attachment-file-card.tsx       # new — non-image download card
├── _hooks/
│   ├── use-attachment-uploads.ts      # new — orchestrates presign → PUT → finalize per file
│   └── use-paste-attachments.ts       # new — wires window paste listener
└── _libs/
    └── attachments.ts                 # new — fetchPresign, putToR2, fetchDownloadUrl
```

Plus one shared module at the app root (used by both web and intended to mirror the API allowlist):

```
apps/web/lib/
└── attachment-mime.ts                 # new — MIME allowlist, accept string, validateFile()
```

## 5.0 Client-side MIME / extension filtering

The backend is the source of truth ([03-backend-upload-api.md](03-backend-upload-api.md) §3.2), but the UI must filter proactively so the user gets instant feedback and we don't burn a `/presign` call + DB row on a doomed upload.

### `apps/web/lib/attachment-mime.ts`

This file mirrors the server allowlist. Keep it byte-for-byte identical with the BE map — when one changes, the other must change in the same PR. Add a comment at the top of both files pointing at each other.

```typescript
// Mirror of apps/api/src/attachments/attachments.helpers.ts ATTACHMENT_MIME_ALLOWLIST.
// Both files MUST stay in sync — update them together.
export const ATTACHMENT_MIME_ALLOWLIST: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

// Used as the value of the <input type="file" accept="..."> attribute.
// Includes both MIME types and dotted extensions so OS file pickers behave
// correctly on platforms where MIME detection is unreliable (notably Windows).
export const ATTACHMENT_ACCEPT_ATTR = [
  ...Object.keys(ATTACHMENT_MIME_ALLOWLIST),
  ...Object.values(ATTACHMENT_MIME_ALLOWLIST).map((ext) => `.${ext}`),
].join(',');

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // keep in sync with R2_MAX_UPLOAD_BYTES
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

export type FileRejection =
  | { kind: 'unsupported-type'; file: File }
  | { kind: 'too-large'; file: File; maxBytes: number }
  | { kind: 'too-many'; file: File; max: number };

export function extensionForFile(file: File): string | null {
  // Prefer MIME, fall back to filename extension for browsers/OSes that lie about file.type.
  const byMime = ATTACHMENT_MIME_ALLOWLIST[file.type.toLowerCase()];
  if (byMime) return byMime;
  const dot = file.name.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = file.name.slice(dot + 1).toLowerCase();
  return Object.values(ATTACHMENT_MIME_ALLOWLIST).includes(ext) ? ext : null;
}

export function validateFiles(
  incoming: File[],
  alreadyAttachedCount: number,
): { accepted: File[]; rejected: FileRejection[] } {
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];

  for (const file of incoming) {
    if (alreadyAttachedCount + accepted.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
      rejected.push({ kind: 'too-many', file, max: MAX_ATTACHMENTS_PER_MESSAGE });
      continue;
    }
    if (!extensionForFile(file)) {
      rejected.push({ kind: 'unsupported-type', file });
      continue;
    }
    if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) {
      rejected.push({ kind: 'too-large', file, maxBytes: MAX_ATTACHMENT_BYTES });
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejected };
}
```

### Where filtering is applied

Every entry point that produces files runs them through `validateFiles()` before they reach the upload queue:

| Entry point | Filtering |
|---|---|
| `<input type="file" accept={ATTACHMENT_ACCEPT_ATTR} multiple>` in the picker button | OS file picker greys out unsupported types (best-effort) **and** `addFiles` re-validates in case the user typed a filename to bypass the filter or the OS ignored `accept`. |
| Drag-and-drop overlay | `addFiles` validates every dropped file — `accept=` does nothing for drops. |
| Paste handler | `addFiles` validates every pasted file — same reason. |

All three routes call `useAttachmentUploads.addFiles(files)`, so the validation lives in one place.

### Error feedback

`addFiles` reports rejections via `react-hot-toast`. To avoid toast spam when a user drags 20 unsupported files, aggregate:

```typescript
const { accepted, rejected } = validateFiles(files, items.length);

if (rejected.length) {
  const byKind = groupBy(rejected, (r) => r.kind);
  if (byKind['unsupported-type']?.length) {
    toast.error(
      byKind['unsupported-type'].length === 1
        ? `"${byKind['unsupported-type'][0].file.name}" — file type not supported`
        : `${byKind['unsupported-type'].length} files skipped (unsupported type)`,
    );
  }
  if (byKind['too-large']?.length) {
    toast.error(
      `${byKind['too-large'].length} file(s) exceed the ${formatBytes(MAX_ATTACHMENT_BYTES)} limit`,
    );
  }
  if (byKind['too-many']?.length) {
    toast.error(`Max ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message`);
  }
}

for (const file of accepted) enqueue(file);
```

`accepted` is what actually proceeds to `/presign`. The server still re-validates (defense in depth) — the client filter is for UX, not security.

## 5.1 Upload orchestration hook

`use-attachment-uploads.ts` owns the queue. It is the only place that touches the upload state machine.

```typescript
type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'error';

type PendingAttachment = {
  localId: string;            // client-only, used for React keys + previews
  file: File;
  previewUrl: string | null;  // URL.createObjectURL for images, null otherwise
  status: UploadStatus;
  progress: number;           // 0..1
  serverId: string | null;    // attachmentId from /presign once known
  error: string | null;
};

export function useAttachmentUploads(channelId: string) {
  // useRef + useState combo: useRef for the imperative queue, useState to trigger renders.
  // (Avoid useEffect — uploads kick off from event handlers, not lifecycle.)

  function addFiles(files: File[]) { /* enqueue + start upload per file */ }
  function remove(localId: string) { /* cancel in-flight, revoke preview URL */ }
  function reset() { /* clear all */ }

  return {
    items: PendingAttachment[],
    addFiles,
    remove,
    reset,
    isAnyUploading: boolean,
    readyServerIds: string[],   // serverIds for items with status === 'uploaded'
  };
}
```

Per-file pipeline:

1. `POST /attachments/presign` with `{ channelId, filename, contentType, sizeBytes }`.
2. `axios.put(uploadUrl, file, { headers: { 'content-type': file.type }, onUploadProgress })`. **Bypass the shared `api` instance** — presigned URLs are R2 URLs that must not carry the Better Auth cookie. Use `axios.create()` locally or `fetch`.
3. On success, mark `uploaded` + store `serverId`. No explicit `/finalize` call — `POST /channels/:id/messages` finalizes server-side.
4. On failure, mark `error` with a retry button in the UI.

For images, create a preview URL synchronously with `URL.createObjectURL(file)` so the thumbnail appears instantly. Revoke it on `remove` / `reset` / unmount.

## 5.2 Attachment picker button

A small `+` button styled like Discord's, placed left of the `Textarea` inside `message-input.tsx`. It uses a hidden `<input type="file" multiple>` that the button clicks programmatically via `useRef`. The `accept` attribute comes from the shared MIME module so the OS file picker pre-filters to supported types:

```tsx
import { ATTACHMENT_ACCEPT_ATTR } from '@/lib/attachment-mime';

<input
  ref={fileInputRef}
  type="file"
  multiple
  hidden
  accept={ATTACHMENT_ACCEPT_ATTR}
  onChange={(e) => {
    const files = Array.from(e.target.files ?? []);
    onAdd(files); // addFiles re-validates — accept= is best-effort only
    e.target.value = ''; // allow re-selecting the same file
  }}
/>
<Button
  size="icon"
  variant="ghost"
  className="h-7 w-7 shrink-0"
  onClick={() => fileInputRef.current?.click()}
>
  <Plus className="h-4 w-4" />
</Button>
```

## 5.3 Preview tray

Renders above the textarea inside the same rounded container, only when there are pending attachments:

- Images: 80×80 rounded thumb with a hover overlay and an `X` button top-right.
- Other files: a 220×80 card with file icon + filename + size + `X` button.
- A subtle progress bar across the bottom edge of each item while uploading.
- Error state: red border + retry icon.

Use shadcn `Card`, `Button`, and `Progress` — no custom CSS. Icons from `lucide-react`: `Plus`, `X`, `RotateCcw`, `FileText`, `Film`, `Music`, `File`.

## 5.4 Drag-and-drop overlay

A full-area drop zone over the channel view (message list + input):

```tsx
// channel-drop-overlay.tsx — listens for dragenter on the channel container.
// Shows a translucent dashed border with "Drop to upload" text while dragging.
// On drop, calls onAdd(files).
```

Mount it from `channel-view.tsx` and pass `addFiles` from the upload hook. Use `useRef` for a counter to handle nested `dragenter`/`dragleave` correctly (the classic drag-counter pattern).

## 5.5 Paste-to-upload

```typescript
// use-paste-attachments.ts
export function usePasteAttachments(onAdd: (files: File[]) => void) {
  const handler = useCallback((e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length) {
      e.preventDefault();
      onAdd(files);
    }
  }, [onAdd]);

  // useEffect is acceptable here — it's a window-level imperative listener.
  useEffect(() => {
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [handler]);
}
```

Wire it from `channel-view.tsx` so pasting works anywhere in the channel, not only when the textarea is focused.

## 5.6 Updated `message-input.tsx`

Changes:

- Accept `uploads` + `onAddFiles` + `onRemoveFile` props from the parent.
- Render `<AttachmentPreviewTray />` above the textarea.
- Render `<AttachmentPickerButton />` left of the textarea.
- Disable send while `isAnyUploading || (!content && readyServerIds.length === 0)`.
- On submit, pass `readyServerIds` along with the content to `onSend`.

## 5.7 Send wiring in `channel-view.tsx`

```typescript
const uploads = useAttachmentUploads(channelId);
usePasteAttachments(uploads.addFiles);

function handleSend(content: string) {
  sendMessage.mutate(
    { channelId, content, attachmentIds: uploads.readyServerIds },
    { onSuccess: () => uploads.reset() },
  );
}
```

## 5.8 Rendering attachments in messages

`message-attachments.tsx` chooses a renderer per attachment:

- `image/*` → `<AttachmentImage />` — fetches the signed download URL via TanStack Query (cached by `attachmentId`), renders an `<img>` with `max-w-[400px] max-h-[300px]` and a click-to-open lightbox (use shadcn `Dialog`).
- `video/*` → `<video controls preload="metadata">` with the signed URL.
- `audio/*` → `<audio controls>`.
- everything else → `<AttachmentFileCard />` — icon + filename + size + download button. Clicking opens the signed URL in a new tab.

Download URL query:

```typescript
function useAttachmentDownloadUrl(id: string, enabled = true) {
  return useQuery({
    queryKey: ['attachment-download', id],
    queryFn: ({ signal }) => fetchAttachmentDownloadUrl(id, { signal }),
    enabled,
    staleTime: 5 * 60 * 1000, // refetch before the 10 min presign TTL expires
  });
}
```

For images shown in the message list, fetch eagerly (`enabled = true` on mount). For file cards, only fetch when the user clicks download (`enabled` gated on a state ref) — saves presign calls.

## 5.9 Polish details that make it feel like Discord

- Multiple images in a single message: render in a 2-column grid with consistent corner rounding.
- Show a small spinner badge on the message while any attachment image is still loading.
- Tooltip on hover over a file card shows the full filename (when truncated).
- Esc closes the lightbox.
- Sent messages show attachments below the text; if there's no text, the bubble shrinks to fit.

## 5.10 What about `useState` / `useEffect`?

Per CLAUDE.md, these are last resort. Where this feature genuinely needs them:

- `useAttachmentUploads` — the upload queue is interactive client state with no URL-shaped or server-shaped equivalent. `useState` for the items array is correct.
- `usePasteAttachments` — a window-level event listener that has no React equivalent. `useEffect` is correct.
- Lightbox open/close — drive via a URL search param (`?lightbox=<attachmentId>`) so it's deep-linkable and back-button friendly. No `useState` needed.
- Hidden file input + drag counter — `useRef` only.

## Verification

Use the preview tools (`preview_*`) once implementation is in:

- Pick a single image → preview appears → send → image renders inline for both the sender and a second tab.
- Drag a PDF onto the channel → drop overlay shows → release → file card appears in the tray → send.
- Paste a screenshot → instantly appears in the tray.
- Try a `.exe` (or unsupported MIME) via the `+` button → OS picker greys it out; if forced through, `addFiles` rejects it with a toast and no `/presign` request fires (verify via `preview_network`).
- Drag-and-drop a `.exe` → rejected with a toast (drop bypasses `accept=`, so this proves `validateFiles` covers the drop path).
- Paste a screenshot with `.bmp` MIME (unsupported) → rejected with a toast.
- Drag 5 supported files + 3 unsupported files at once → 5 enqueued, single aggregate toast for the 3 rejections.
- Try a 100 MiB file → friendly error toast referencing the size limit, no `/presign` request.
- Pick 11 supported files at once → 10 enqueued, single toast about the per-message cap.

Once green, move to [06-permissions-security.md](06-permissions-security.md).
