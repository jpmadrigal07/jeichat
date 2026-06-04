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

export function buildStorageKey(
  workspaceId: string,
  channelId: string,
  ext: string,
): { key: string; id: string } {
  const id = crypto.randomUUID();
  return { id, key: `${workspaceId}/${channelId}/${id}.${ext}` };
}
