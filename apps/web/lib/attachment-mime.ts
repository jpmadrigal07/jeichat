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

export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_ATTACHMENTS = 5;
export const MAX_DOCUMENT_ATTACHMENTS = 10;
export const MAX_ATTACHMENTS_PER_MESSAGE =
  MAX_IMAGE_ATTACHMENTS + MAX_DOCUMENT_ATTACHMENTS;
export const MAX_THREAD_ATTACHMENTS = MAX_ATTACHMENTS_PER_MESSAGE;

export const IMAGE_ACCEPT_ATTR = [
  ...Object.entries(ATTACHMENT_MIME_ALLOWLIST)
    .filter(([mime]) => mime.startsWith('image/'))
    .flatMap(([mime, ext]) => [mime, `.${ext}`]),
].join(',');

export type AttachmentKindCounts = {
  images: number;
  documents: number;
};

export type FileRejection =
  | { kind: 'unsupported-type'; file: File }
  | { kind: 'too-large'; file: File; maxBytes: number }
  | { kind: 'too-many-images'; file: File; max: number }
  | { kind: 'too-many-documents'; file: File; max: number };

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

export function isImageContentType(contentType: string): boolean {
  return contentType.toLowerCase().startsWith('image/');
}

export function isImageFile(file: File): boolean {
  if (isImageContentType(file.type)) return true;
  return isImageContentType(mimeTypeForFile(file));
}

export function countAttachmentKinds(
  items: Array<{ contentType?: string; type?: string } | File>,
): AttachmentKindCounts {
  let images = 0;
  let documents = 0;
  for (const item of items) {
    const mime =
      item instanceof File
        ? mimeTypeForFile(item)
        : (item.contentType ?? item.type ?? '');
    if (isImageContentType(mime)) images += 1;
    else documents += 1;
  }
  return { images, documents };
}

export function validateFiles(
  incoming: File[],
  already: AttachmentKindCounts = { images: 0, documents: 0 },
): { accepted: File[]; rejected: FileRejection[] } {
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];
  let images = already.images;
  let documents = already.documents;

  for (const file of incoming) {
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
    if (isImageFile(file)) {
      if (images >= MAX_IMAGE_ATTACHMENTS) {
        rejected.push({
          kind: 'too-many-images',
          file,
          max: MAX_IMAGE_ATTACHMENTS,
        });
        continue;
      }
      images += 1;
    } else if (documents >= MAX_DOCUMENT_ATTACHMENTS) {
      rejected.push({
        kind: 'too-many-documents',
        file,
        max: MAX_DOCUMENT_ATTACHMENTS,
      });
      continue;
    } else {
      documents += 1;
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
