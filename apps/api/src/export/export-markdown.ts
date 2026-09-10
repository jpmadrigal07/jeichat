import { isImageContentType } from '../attachments/attachments.helpers';

/** Close unclosed fenced code blocks so later markdown cannot be swallowed. */
export function closeOpenCodeFences(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n');
  let open: { char: '`' | '~'; length: number } | null = null;

  for (const line of normalized.split('\n')) {
    const match = /^( {0,3})([`~]{3,})(.*)$/.exec(line);
    if (!match) continue;

    const marker = match[2];
    const char = marker[0] as '`' | '~';
    const length = marker.length;
    const rest = match[3];

    if (open === null) {
      if (char === '`' && rest.includes('`')) continue;
      open = { char, length };
      continue;
    }

    if (char === open.char && length >= open.length && rest.trim() === '') {
      open = null;
    }
  }

  if (!open) return normalized;
  const closer = open.char.repeat(open.length);
  return normalized.endsWith('\n')
    ? `${normalized}${closer}\n`
    : `${normalized}\n${closer}`;
}

export function toBlockquote(markdown: string): string {
  return markdown.split('\n').map((line) => `> ${line}`).join('\n');
}

export function embedDescriptionMarkdown(description: string): string {
  return toBlockquote(closeOpenCodeFences(description));
}

export function embedMessageMarkdown(content: string): string {
  return closeOpenCodeFences(content);
}

export type ExportAttachmentMarkdown = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

/** Safe zip path segment: no directories, no `..`, no backslashes. */
export function zipEntryFilename(id: string, filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.trim() || 'file';
  const safe =
    base.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '') || 'file';
  return `${id}-${safe.slice(0, 80)}`;
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeMarkdownAlt(text: string): string {
  return text.replace(/[[\]]/g, '');
}

/** Caption-only for clipboard/.md, or image/file links for the zip. */
export function embedAttachmentMarkdown(
  attachment: ExportAttachmentMarkdown,
  relativePath?: string,
): string {
  const size = formatByteSize(attachment.sizeBytes);
  const kind = isImageContentType(attachment.contentType) ? 'Image' : 'File';
  const caption = `[${kind}: ${attachment.filename} · ${attachment.contentType} · ${size}]`;

  if (!relativePath) return caption;

  const alt = escapeMarkdownAlt(attachment.filename);
  if (isImageContentType(attachment.contentType)) {
    return `![${alt}](${relativePath})\n\n${caption}`;
  }
  return `[${alt}](${relativePath})\n\n${caption}`;
}

export type TicketAttachmentGroupMarkdown = {
  sourceLabel: string | null;
  attachments: Array<ExportAttachmentMarkdown & { entryName: string }>;
};

export function embedTicketAttachmentsMarkdown(
  groups: TicketAttachmentGroupMarkdown[],
  linkFiles: boolean,
): string {
  const nonempty = groups.filter((group) => group.attachments.length > 0);
  if (nonempty.length === 0) return '';

  const lines: string[] = ['### Ticket attachments', ''];
  for (const group of nonempty) {
    if (group.sourceLabel) {
      lines.push(`**${group.sourceLabel}**`);
      lines.push('');
    }
    for (const attachment of group.attachments) {
      const relativePath = linkFiles
        ? `files/${attachment.entryName}`
        : undefined;
      lines.push(embedAttachmentMarkdown(attachment, relativePath));
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function sanitizeDownloadBasename(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  return (cleaned || 'export').slice(0, 80);
}
