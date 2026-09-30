/** Markdown image target for ticket description inline images (not http URLs). */
export const ATTACHMENT_IMAGE_PREFIX = 'attachment:';

const ATTACHMENT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DESCRIPTION_ATTACHMENT_RE =
  /!\[[^\]]*]\(attachment:([0-9a-f-]{36})\)/gi;

export function sanitizeAttachmentImageAlt(alt: string): string {
  return alt.replace(/[\[\]]/g, '').trim() || 'image';
}

export function attachmentImageMarkdown(
  attachmentId: string,
  alt?: string,
): string {
  const label = sanitizeAttachmentImageAlt(alt ?? 'image');
  return `![${label}](${ATTACHMENT_IMAGE_PREFIX}${attachmentId})`;
}

export function parseAttachmentIdFromImageSrc(
  src: string | undefined,
): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (trimmed.startsWith(ATTACHMENT_IMAGE_PREFIX)) {
    const id = trimmed.slice(ATTACHMENT_IMAGE_PREFIX.length);
    return ATTACHMENT_ID_RE.test(id) ? id : null;
  }
  const pathMatch = /^\/attachments\/([0-9a-f-]{36})$/i.exec(trimmed);
  if (pathMatch?.[1] && ATTACHMENT_ID_RE.test(pathMatch[1])) {
    return pathMatch[1];
  }
  return null;
}

export function parseAttachmentIdsFromDescription(content: string): string[] {
  const ids = new Set<string>();
  for (const match of content.matchAll(DESCRIPTION_ATTACHMENT_RE)) {
    const id = match[1];
    if (id && ATTACHMENT_ID_RE.test(id)) ids.add(id);
  }
  return [...ids];
}

export function insertTextAtCaret(
  textarea: HTMLTextAreaElement,
  text: string,
): void {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const needsLeadingBreak =
    before.length > 0 && !before.endsWith('\n') && !text.startsWith('\n');
  const snippet = `${needsLeadingBreak ? '\n\n' : ''}${text}`;
  const next = before + snippet + after;
  textarea.value = next;
  const caret = before.length + snippet.length;
  textarea.selectionStart = caret;
  textarea.selectionEnd = caret;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

export function clipboardImageFiles(clipboardData: DataTransfer): File[] {
  const fromItems: File[] = [];
  for (const item of clipboardData.items) {
    if (item.kind !== 'file') continue;
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file) fromItems.push(file);
  }
  if (fromItems.length) return fromItems;
  return Array.from(clipboardData.files ?? []).filter((file) =>
    file.type.startsWith('image/'),
  );
}
