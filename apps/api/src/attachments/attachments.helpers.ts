// Keep in sync with apps/web/lib/attachment-mime.ts (see docs/attachments/05-frontend-attachment-ui.md §5.0).

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
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
};

export function extensionForContentType(contentType: string): string | null {
  return ATTACHMENT_MIME_ALLOWLIST[contentType.toLowerCase()] ?? null;
}

/** Strip control characters; truncate for DB display. */
export function sanitizeFilename(filename: string): string {
  const cleaned = filename.replace(/[\x00-\x1f\x7f]/g, '').trim();
  return (cleaned.length > 0 ? cleaned : 'file').slice(0, 255);
}

/** Safe filename for `Content-Disposition` on presigned GET URLs. */
export function sanitizeContentDispositionFilename(filename: string): string {
  return sanitizeFilename(filename).replace(/["\\]/g, '_');
}

const INLINE_RENDERABLE_PREFIXES = ['image/', 'video/', 'audio/'] as const;

/** Documents and archives force download; media the UI embeds may render inline. */
export function shouldForceDownloadDisposition(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return !INLINE_RENDERABLE_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
}

export function buildStorageKey(
  workspaceId: string,
  channelId: string,
  ext: string,
): { key: string; id: string } {
  const id = crypto.randomUUID();
  return { id, key: `${workspaceId}/${channelId}/${id}.${ext}` };
}

export const ATTACHMENT_PURPOSE = {
  MESSAGE: 'message',
  THREAD: 'thread',
} as const;

export const MAX_THREAD_ATTACHMENTS = 5;

export function isImageContentType(contentType: string): boolean {
  return contentType.toLowerCase().startsWith('image/');
}
