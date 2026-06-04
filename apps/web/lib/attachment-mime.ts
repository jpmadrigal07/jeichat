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
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
};

export const ATTACHMENT_ACCEPT_ATTR = [
  ...Object.keys(ATTACHMENT_MIME_ALLOWLIST),
  ...Object.values(ATTACHMENT_MIME_ALLOWLIST).map((ext) => `.${ext}`),
].join(',');

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

export type FileRejection =
  | { kind: 'unsupported-type'; file: File }
  | { kind: 'too-large'; file: File; maxBytes: number }
  | { kind: 'too-many'; file: File; max: number };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extensionForFile(file: File): string | null {
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
      rejected.push({
        kind: 'too-many',
        file,
        max: MAX_ATTACHMENTS_PER_MESSAGE,
      });
      continue;
    }
    if (!extensionForFile(file)) {
      rejected.push({ kind: 'unsupported-type', file });
      continue;
    }
    if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) {
      rejected.push({
        kind: 'too-large',
        file,
        maxBytes: MAX_ATTACHMENT_BYTES,
      });
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejected };
}

export function mimeTypeForFile(file: File): string {
  if (file.type) return file.type;
  const ext = extensionForFile(file);
  if (!ext) return 'application/octet-stream';
  const entry = Object.entries(ATTACHMENT_MIME_ALLOWLIST).find(
    ([, e]) => e === ext,
  );
  return entry?.[0] ?? 'application/octet-stream';
}
